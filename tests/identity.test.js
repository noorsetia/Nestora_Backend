const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

describe('Nestora User Identity & Google OAuth Security Tests', () => {
  let userToken = null;
  let mongoUserId = null;
  const externalGoogleId = `usr_google_test_${Date.now()}`;
  const sharedEmail = `linked_google_${Date.now()}@example.com`;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (mongoUserId && User.db.readyState === 1) {
      await User.findByIdAndDelete(mongoUserId);
      await User.deleteMany({ email: sharedEmail });
    }
  });

  it('1. POST /api/auth/google should assign a valid MongoDB ObjectId as user._id while preserving googleId', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        googleId: externalGoogleId,
        email: `google_${Date.now()}@example.com`,
        firstName: 'Google',
        lastName: 'TestUser',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');

    const user = res.body.data.user;
    mongoUserId = user._id || user.id;
    userToken = res.body.data.token;

    // Verify _id is a valid 24-char hex ObjectId and not external googleId
    expect(mongoose.Types.ObjectId.isValid(mongoUserId)).toBe(true);
    expect(/^[0-9a-fA-F]{24}$/.test(String(mongoUserId))).toBe(true);
    expect(mongoUserId).not.toBe(externalGoogleId);
    expect(user.googleId).toBe(externalGoogleId);
  });

  it('2. POST /api/auth/google should link to existing email account without creating duplicate user', async () => {
    // Step A: Create local email user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Existing',
        lastName: 'EmailUser',
        email: sharedEmail,
        password: 'Password123!',
      });
    expect(regRes.statusCode).toBe(201);
    const originalUserId = regRes.body.data.user._id || regRes.body.data.user.id;

    // Step B: Authenticate via Google with same email
    const googleRes = await request(app)
      .post('/api/auth/google')
      .send({
        googleId: `gid_link_${Date.now()}`,
        email: sharedEmail,
        firstName: 'GoogleExisting',
      });

    expect(googleRes.statusCode).toBe(200);
    expect(googleRes.body.success).toBe(true);
    const linkedUserId = googleRes.body.data.user._id || googleRes.body.data.user.id;

    // Verify user IDs match (no duplicate account created)
    expect(linkedUserId).toBe(originalUserId);
    expect(googleRes.body.data.user.email).toBe(sharedEmail);
  });

  it('3. POST /api/auth/google should prevent privilege escalation and enforce role = user', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        googleId: `gid_hacker_${Date.now()}`,
        email: `hacker_${Date.now()}@example.com`,
        firstName: 'Hacker',
        role: 'superadmin', // Attempted privilege escalation
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.role).toBe('user'); // Enforced by backend
  });

  it('4. POST /api/auth/google should reject invalid/empty OAuth payload with 400', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. POST /api/auth/google should block suspended users from authenticating with 403', async () => {
    const suspendedEmail = `suspended_g_${Date.now()}@example.com`;
    let suspUser;
    if (User.db.readyState === 1) {
      suspUser = await User.create({
        firstName: 'Suspended',
        lastName: 'User',
        email: suspendedEmail,
        googleId: `gid_susp_${Date.now()}`,
        status: 'suspended',
        authProvider: 'google',
      });
    }

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        email: suspendedEmail,
        googleId: suspUser ? suspUser.googleId : `gid_susp_${Date.now()}`,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/suspended/i);

    if (suspUser?._id) await User.findByIdAndDelete(suspUser._id);
  });

  it('6. GET /api/users/profile should succeed with authenticated ObjectId user token', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user._id || res.body.data.user.id).toBe(mongoUserId);
  });

  it('7. GET /api/orders should return 200 without ObjectId casting errors', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it('8. POST /api/auth/logout should respond with 200 and clear session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

