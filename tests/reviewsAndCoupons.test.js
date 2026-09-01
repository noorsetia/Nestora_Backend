const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Review = require('../src/models/Review');
const Coupon = require('../src/models/Coupon');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const productService = require('../src/services/productService');
const reviewService = require('../src/services/reviewService');
const couponService = require('../src/services/couponService');

jest.setTimeout(15000);

describe('Admin Reviews & Coupon Management API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9d111';
  const adminId = '65f1a2b3c4d5e6f7a8b9d222';
  const productId = '65f1a2b3c4d5e6f7a8b9d333';
  const reviewId = '65f1a2b3c4d5e6f7a8b9d444';
  const couponId = '65f1a2b3c4d5e6f7a8b9d555';

  let customerToken;
  let adminToken;

  const testCustomer = {
    _id: new mongoose.Types.ObjectId(customerId),
    id: customerId,
    firstName: 'Reviewer',
    lastName: 'User',
    email: 'rev_customer@nestora.com',
    role: 'user',
    status: 'active',
  };

  const testAdmin = {
    _id: new mongoose.Types.ObjectId(adminId),
    id: adminId,
    firstName: 'Review',
    lastName: 'Admin',
    email: 'rev_admin@nestora.com',
    role: 'admin',
    status: 'active',
  };

  const testProduct = {
    _id: new mongoose.Types.ObjectId(productId),
    customId: productId,
    name: 'Nordic Teak Dining Table',
    sku: 'NST-TABLE-01',
    rating: 0,
    reviewCount: 0,
    price: 45000,
    status: 'active',
  };

  const testReview = {
    _id: new mongoose.Types.ObjectId(reviewId),
    id: reviewId,
    product: new mongoose.Types.ObjectId(productId),
    user: new mongoose.Types.ObjectId(customerId),
    rating: 5,
    title: 'Exquisite Craftsman Quality',
    comment: 'The solid teak grain is stunning and fits perfectly in our dining area.',
    status: 'pending',
    isVerifiedPurchase: true,
    createdAt: new Date(),
  };

  const testCoupon = {
    _id: new mongoose.Types.ObjectId(couponId),
    id: couponId,
    code: 'FESTIVE20',
    description: 'Festive Season 20% Discount',
    type: 'percentage',
    value: 20,
    minimumOrderValue: 10000,
    maximumDiscount: 5000,
    usageLimit: 100,
    usedCount: 0,
    perUserLimit: 1,
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  };

  const expiredCoupon = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9d666'),
    id: '65f1a2b3c4d5e6f7a8b9d666',
    code: 'EXPIRED50',
    description: 'Expired Flash Sale',
    type: 'percentage',
    value: 50,
    minimumOrderValue: 0,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    isActive: true,
  };

  beforeAll(async () => {
    memoryUsers[customerId] = testCustomer;
    memoryUsers[adminId] = testAdmin;

    if (productService.memoryProducts) {
      productService.memoryProducts.push(testProduct);
    }
    if (reviewService.memoryReviews) {
      reviewService.memoryReviews.length = 0;
      reviewService.memoryReviews.push({ ...testReview });
    }
    if (couponService.memoryCoupons) {
      couponService.memoryCoupons.length = 0;
      couponService.memoryCoupons.push({ ...testCoupon }, { ...expiredCoupon });
    }

    if (User.db.readyState === 1) {
      await User.deleteMany({ email: { $in: ['rev_customer@nestora.com', 'rev_admin@nestora.com'] } });
      await User.create(testCustomer);
      await User.create(testAdmin);

      await Product.deleteMany({ sku: 'NST-TABLE-01' });
      await Product.create(testProduct);

      await Review.deleteMany({ _id: testReview._id });
      await Review.create(testReview);

      await Coupon.deleteMany({ code: { $in: ['FESTIVE20', 'EXPIRED50', 'NEWYEAR15'] } });
      await Coupon.create(testCoupon);
      await Coupon.create(expiredCoupon);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  // --- REVIEW MODERATION TESTS ---

  it('1. GET /api/admin/reviews should return paginated reviews for admin', async () => {
    const res = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reviews).toBeDefined();
  });

  it('2. GET /api/admin/reviews should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. PATCH /api/admin/reviews/:id/status should approve review and recalculate rating', async () => {
    const res = await request(app)
      .patch(`/api/admin/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
  });

  it('4. POST /api/admin/reviews/:id/respond should add official admin response', async () => {
    const res = await request(app)
      .post(`/api/admin/reviews/${reviewId}/respond`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Thank you for choosing Nestora Atelier!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.adminResponse.comment).toBe('Thank you for choosing Nestora Atelier!');
  });

  // --- COUPON MANAGEMENT TESTS ---

  it('5. GET /api/admin/coupons should return list of coupons for admin', async () => {
    const res = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('6. POST /api/admin/coupons should create new coupon with valid data', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'NEWYEAR15',
        description: 'New Year 15% discount',
        type: 'percentage',
        value: 15,
        minimumOrderValue: 5000,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('NEWYEAR15');
  });

  it('7. POST /api/admin/coupons should reject duplicate coupon code with 400', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'FESTIVE20',
        description: 'Duplicate code',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('8. POST /api/coupons/validate should validate coupon for checkout', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: 'FESTIVE20',
        subtotal: 20000,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.discountAmount).toBe(4000); // 20% of 20,000 = 4,000
  });

  it('9. POST /api/coupons/validate should reject expired coupon code with 400', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: 'EXPIRED50',
        subtotal: 20000,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('10. PATCH /api/admin/coupons/:id/status should activate/deactivate coupon', async () => {
    const res = await request(app)
      .patch(`/api/admin/coupons/${couponId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);
  });

  it('11. GET /api/admin/coupons should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
