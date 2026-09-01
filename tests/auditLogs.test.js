const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const auditLogService = require('../src/services/auditLogService');

jest.setTimeout(15000);

describe('Admin Audit Logs & Security Governance API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9f111';
  const adminId = '65f1a2b3c4d5e6f7a8b9f222';
  const superadminId = '65f1a2b3c4d5e6f7a8b9f333';
  const logId = '65f1a2b3c4d5e6f7a8b9f444';

  let customerToken;
  let adminToken;
  let superadminToken;

  const testCustomer = {
    _id: new mongoose.Types.ObjectId(customerId),
    id: customerId,
    firstName: 'Audit',
    lastName: 'Customer',
    email: 'audit_customer@nestora.com',
    role: 'user',
    status: 'active',
  };

  const testAdmin = {
    _id: new mongoose.Types.ObjectId(adminId),
    id: adminId,
    firstName: 'Audit',
    lastName: 'Admin',
    email: 'audit_admin@nestora.com',
    role: 'admin',
    status: 'active',
  };

  const testSuperadmin = {
    _id: new mongoose.Types.ObjectId(superadminId),
    id: superadminId,
    firstName: 'Super',
    lastName: 'Governance',
    email: 'audit_superadmin@nestora.com',
    role: 'superadmin',
    status: 'active',
  };

  const testLog = {
    _id: new mongoose.Types.ObjectId(logId),
    id: logId,
    user: new mongoose.Types.ObjectId(adminId),
    action: 'MUTATE_STOCK',
    entity: 'Product',
    entityId: '65f1a2b3c4d5e6f7a8b9f999',
    metadata: {
      oldStock: 5,
      newStock: 20,
      password: 'superSecretPassword123!',
      jwt: 'header.payload.signature',
      razorpaySecret: 'rzp_sec_9999',
    },
    createdAt: new Date(),
  };

  beforeAll(async () => {
    memoryUsers[customerId] = testCustomer;
    memoryUsers[adminId] = testAdmin;
    memoryUsers[superadminId] = testSuperadmin;

    if (auditLogService.memoryAuditLogs) {
      auditLogService.memoryAuditLogs.length = 0;
      auditLogService.memoryAuditLogs.push({ ...testLog });
    }

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['audit_customer@nestora.com', 'audit_admin@nestora.com', 'audit_superadmin@nestora.com'] },
      });
      await User.create(testCustomer);
      await User.create(testAdmin);
      await User.create(testSuperadmin);

      await AuditLog.deleteMany({ _id: testLog._id });
      await AuditLog.create(testLog);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
    superadminToken = generateToken(superadminId, 'superadmin');
  });

  // 1. UNPROTECTED REJECTION
  it('1. GET /api/admin/audit-logs should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/audit-logs');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 2. CUSTOMER ACCESS REJECTION
  it('2. GET /api/admin/audit-logs should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 3. ADMIN ACCESS
  it('3. GET /api/admin/audit-logs should allow admin access', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
  });

  // 4. SUPERADMIN ACCESS
  it('4. GET /api/admin/audit-logs should allow superadmin access', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 5. SENSITIVE DATA SANITIZATION
  it('5. GET /api/admin/audit-logs should sanitize sensitive fields in metadata', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    const logs = res.body.data.logs;
    const targetLog = logs.find((l) => (l._id || l.id) === logId || l.action === 'MUTATE_STOCK');
    expect(targetLog).toBeDefined();
    expect(targetLog.metadata.password).toBe('[REDACTED]');
    expect(targetLog.metadata.jwt).toBe('[REDACTED]');
    expect(targetLog.metadata.razorpaySecret).toBe('[REDACTED]');
    expect(targetLog.metadata.oldStock).toBe(5);
  });

  // 6. IMMUTABILITY ENFORCEMENT
  it('6. POST/DELETE /api/admin/audit-logs should reject audit modification attempts with 405', async () => {
    const postRes = await request(app)
      .post('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ action: 'FAKE_LOG' });

    expect(postRes.statusCode).toBe(405);
    expect(postRes.body.success).toBe(false);

    const deleteRes = await request(app)
      .delete(`/api/admin/audit-logs/${logId}`)
      .set('Authorization', `Bearer ${superadminToken}`);

    expect(deleteRes.statusCode).toBe(405);
    expect(deleteRes.body.success).toBe(false);
  });

  // 7. INVALID DATE RANGE HANDLING
  it('7. GET /api/admin/audit-logs with invalid date range should return 400', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs?startDate=2026-12-31&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 8. DETAIL RETRIEVAL BY ID
  it('8. GET /api/admin/audit-logs/:id should retrieve specific audit record details', async () => {
    const res = await request(app)
      .get(`/api/admin/audit-logs/${logId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.action).toBe('MUTATE_STOCK');
  });
});
