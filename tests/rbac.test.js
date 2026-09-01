const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');

describe('RBAC Security & Protection', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9c999';
  const adminId = '65f1a2b3c4d5e6f7a8b9c888';
  const superadminId = '65f1a2b3c4d5e6f7a8b9c777';

  let customerToken;
  let adminToken;
  let superadminToken;

  beforeAll(async () => {
    // Populate test accounts in memory store and MongoDB (if connected)
    const customerUser = {
      _id: new mongoose.Types.ObjectId(customerId),
      id: customerId,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'rbac_customer@nestora.com',
      role: 'user',
      status: 'active',
    };

    const adminUser = {
      _id: new mongoose.Types.ObjectId(adminId),
      id: adminId,
      firstName: 'Test',
      lastName: 'Admin',
      email: 'rbac_admin@nestora.com',
      role: 'admin',
      status: 'active',
    };

    const superadminUser = {
      _id: new mongoose.Types.ObjectId(superadminId),
      id: superadminId,
      firstName: 'Test',
      lastName: 'Superadmin',
      email: 'rbac_superadmin@nestora.com',
      role: 'superadmin',
      status: 'active',
    };

    memoryUsers[customerId] = customerUser;
    memoryUsers[adminId] = adminUser;
    memoryUsers[superadminId] = superadminUser;

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['rbac_customer@nestora.com', 'rbac_admin@nestora.com', 'rbac_superadmin@nestora.com'] },
      });
      await User.create(customerUser);
      await User.create(adminUser);
      await User.create(superadminUser);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
    superadminToken = generateToken(superadminId, 'superadmin');
  });

  it('1. GET /api/admin/dashboard should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. GET /api/admin/dashboard should reject customer requests with 403', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. GET /api/admin/dashboard should allow admin requests with 200', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
  });

  it('4. GET /api/admin/dashboard should allow superadmin requests with 200', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
  });

  it('5. PUT /api/users/profile should prevent customer privilege escalation to admin', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ firstName: 'Hacker', role: 'admin' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.role).toBe('user');
  });

  it('6. PATCH /api/admin/users/:id/role should prevent regular admin from modifying user roles', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
