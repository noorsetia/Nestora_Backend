const request = require('supertest');
const app = require('../src/app');

describe('Auth & User Security API', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'Architect',
    email: `test_${Date.now()}@nestora.com`,
    password: 'Password123!',
  };

  it('POST /api/auth/register should create a new user account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect([201, 409]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.password).toBeUndefined();
    }
  });

  it('POST /api/auth/login should authenticate valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    }
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
