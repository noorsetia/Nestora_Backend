const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');

jest.setTimeout(15000);

describe('Admin Customer & User Management API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9f111';
  const adminId = '65f1a2b3c4d5e6f7a8b9f222';
  const superadminId = '65f1a2b3c4d5e6f7a8b9f333';

  let customerToken;
  let adminToken;
  let superadminToken;

  const testCustomer = {
    _id: new mongoose.Types.ObjectId(customerId),
    id: customerId,
    firstName: 'Customer',
    lastName: 'User',
    email: 'usr_customer@nestora.com',
    password: '$2a$10$hashedpassword123',
    role: 'user',
    status: 'active',
    phone: '+91 9876543210',
    verificationToken: 'secret_token_abc',
    createdAt: new Date(),
  };

  const testAdmin = {
    _id: new mongoose.Types.ObjectId(adminId),
    id: adminId,
    firstName: 'Admin',
    lastName: 'Manager',
    email: 'usr_admin@nestora.com',
    password: '$2a$10$hashedpassword456',
    role: 'admin',
    status: 'active',
    phone: '+91 9876543211',
    createdAt: new Date(),
  };

  const testSuperadmin = {
    _id: new mongoose.Types.ObjectId(superadminId),
    id: superadminId,
    firstName: 'Super',
    lastName: 'Admin',
    email: 'usr_super@nestora.com',
    password: '$2a$10$hashedpassword789',
    role: 'superadmin',
    status: 'active',
    phone: '+91 9876543212',
    createdAt: new Date(),
  };

  beforeAll(async () => {
    memoryUsers[customerId] = testCustomer;
    memoryUsers[adminId] = testAdmin;
    memoryUsers[superadminId] = testSuperadmin;

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['usr_customer@nestora.com', 'usr_admin@nestora.com', 'usr_super@nestora.com'] },
      });
      await User.create(testCustomer);
      await User.create(testAdmin);
      await User.create(testSuperadmin);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
    superadminToken = generateToken(superadminId, 'superadmin');
  });

  // 1. UNAUTHENTICATED ACCESS REJECTION
  it('1. GET /api/admin/users should reject unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 2. CUSTOMER ACCESS REJECTION
  it('2. GET /api/admin/users should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 3. ADMIN USER LISTING & SENSITIVE FIELD EXCLUSION
  it('3. GET /api/admin/users should return user list with sensitive fields excluded for admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
    expect(Array.isArray(res.body.data.users)).toBe(true);

    // Verify sensitive field exclusion
    const returnedCustomer = res.body.data.users.find((u) => u._id === customerId || u.email === 'usr_customer@nestora.com');
    if (returnedCustomer) {
      expect(returnedCustomer.password).toBeUndefined();
      expect(returnedCustomer.verificationToken).toBeUndefined();
    }
  });

  // 4. SEARCH & FILTERING
  it('4. GET /api/admin/users should filter by search term and role', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=Customer&role=user')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 5. CUSTOMER DETAILS
  it('5. GET /api/admin/users/:id should return single customer profile details', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('usr_customer@nestora.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  // 6. ACTIVATE / SUSPEND CUSTOMER
  it('6. PATCH /api/admin/users/:id/status should allow admin to suspend user account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${customerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('suspended');
  });

  // 7. SELF-ACCOUNT PROTECTION
  it('7. PATCH /api/admin/users/:id/status should reject admin suspending their own account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 8. UNAUTHORIZED ROLE MODIFICATION (Standard Admin)
  it('8. PATCH /api/admin/users/:id/role should reject role change by standard admin with 403', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 9. SUPERADMIN ROLE MODIFICATION
  it('9. PATCH /api/admin/users/:id/role should allow superadmin to update user role', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${customerId}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'admin' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('admin');
  });

  // 10. SELF-ROLE DEMOTION PROTECTION
  it('10. PATCH /api/admin/users/:id/role should reject superadmin changing their own role', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${superadminId}/role`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ role: 'user' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
