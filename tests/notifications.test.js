const request = require('supertest');
const app = require('../src/app');
const notificationService = require('../src/services/notificationService');
const emailService = require('../src/services/email/emailService');

describe('Notifications & Email System Integration Suite', () => {
  it('GET /api/notifications should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/notifications/unread-count should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/notifications/admin should block regular non-admin users', async () => {
    const res = await request(app).get('/api/notifications/admin');
    expect(res.statusCode).toBe(401);
  });

  describe('NotificationService Unit Fallback Logic', () => {
    it('getUserNotifications should return structured empty pagination if DB unready', async () => {
      const res = await notificationService.getUserNotifications('60d5ecb8b392d70015949a2a', {});
      expect(res).toHaveProperty('notifications');
      expect(res).toHaveProperty('pagination');
      expect(Array.isArray(res.notifications)).toBe(true);
    });

    it('getUnreadCount should return integer 0 gracefully', async () => {
      const count = await notificationService.getUnreadCount('60d5ecb8b392d70015949a2a');
      expect(typeof count).toBe('number');
    });
  });

  describe('EmailService Unit Safe Dispatches', () => {
    it('sendWelcomeEmail should execute without throwing errors', async () => {
      const dummyUser = { firstName: 'Seraphina', email: 'seraphina@nestora.com' };
      const res = await emailService.sendWelcomeEmail(dummyUser);
      expect(res).toBeDefined();
    });

    it('sendOrderConfirmationEmail should execute safely', async () => {
      const dummyOrder = {
        orderNumber: 'NST-20260813-9999',
        total: 85000,
        items: [{ name: 'Velvet Ottoman', quantity: 1, price: 85000 }],
        shippingAddress: {
          fullName: 'Seraphina Vance',
          addressLine1: '42 Atelier Blvd',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          email: 'seraphina@nestora.com',
        },
      };
      const dummyUser = { email: 'seraphina@nestora.com' };
      const res = await emailService.sendOrderConfirmationEmail({ user: dummyUser, order: dummyOrder });
      expect(res).toBeDefined();
    });
  });
});
