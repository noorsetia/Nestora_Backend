const request = require('supertest');
const app = require('../src/app');

describe('Account System API Parity Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Authenticate a user via Google Auth helper
    const authRes = await request(app)
      .post('/api/auth/google')
      .send({
        googleId: 'google_account_test_uid_999999',
        email: 'account.test@nestora.com',
        firstName: 'Account',
        lastName: 'Tester',
      });

    expect(authRes.statusCode).toEqual(200);
    authToken = authRes.body.data.token;
    userId = authRes.body.data.user._id;
  });

  describe('1. Profile & Preferences', () => {
    it('GET /api/users/profile - Returns authenticated user details', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id).toEqual(userId);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('PUT /api/users/preferences - Updates and returns preferences', async () => {
      const res = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderSMS: false, marketingEmail: true });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Wishlist Management', () => {
    const dummyProductId = '507f1f77bcf86cd799439011';

    it('POST /api/users/wishlist/:productId - Adds product to wishlist', async () => {
      const res = await request(app)
        .post(`/api/users/wishlist/${dummyProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/users/wishlist - Retrieves user wishlist', async () => {
      const res = await request(app)
        .get('/api/users/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.wishlist)).toBe(true);
    });

    it('DELETE /api/users/wishlist/:productId - Removes product from wishlist', async () => {
      const res = await request(app)
        .delete(`/api/users/wishlist/${dummyProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Account Deletion Flow', () => {
    it('DELETE /api/users/account - Deletes account and revokes access', async () => {
      const res = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted');
    });
  });
});
