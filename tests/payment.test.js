const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Mock Razorpay SDK at top-level before requiring app/services
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation(async (params) => {
        return {
          id: `order_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          entity: 'order',
          amount: params.amount,
          amount_paid: 0,
          amount_due: params.amount,
          currency: params.currency || 'INR',
          receipt: params.receipt,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000),
        };
      }),
    },
  }));
});

const app = require('../src/app');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const Order = require('../src/models/Order');
const Notification = require('../src/models/Notification');

jest.setTimeout(30000);

const TEST_KEY_ID = 'rzp_test_integration_valid';
const TEST_KEY_SECRET = 'nestora_secret_key_2026_test_valid';

function computeSignature(orderId, paymentId, secret = TEST_KEY_SECRET) {
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('Nestora Complete Order Lifecycle & Payment Reliability Tests', () => {
  let userToken = null;
  let testUser = null;
  let secondaryUserToken = null;
  let secondaryUser = null;
  let activeProduct = null;
  let outOfStockProduct = null;
  let inactiveProduct = null;
  let validCoupon = null;
  let createdOrderId = null;
  let createdOrderNumber = null;

  beforeAll(async () => {
    // Configure valid test credentials for Jest execution
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

    await connectDB();

    // 1. Create Primary Test User & Auth Token
    const userEmail = `orderlife_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Lifecycle',
        lastName: 'Tester',
        email: userEmail,
        password: 'Password123!',
      });

    userToken = regRes.body.data.token;
    testUser = regRes.body.data.user;

    // 2. Create Secondary Test User (to test unauthorized order access)
    const secUserEmail = `secorder_${Date.now()}@example.com`;
    const secRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Secondary',
        lastName: 'User',
        email: secUserEmail,
        password: 'Password123!',
      });

    secondaryUserToken = secRegRes.body.data.token;
    secondaryUser = secRegRes.body.data.user;

    // 3. Create Active Product with stock = 10
    activeProduct = await Product.create({
      sku: `SKU-LIFE-${Date.now()}`,
      name: 'Modern Teak Dining Table',
      slug: `modern-teak-dining-table-${Date.now()}`,
      category: 'Dining',
      price: 35000,
      stock: 10,
      inStock: true,
      isActive: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4',
    });

    // 4. Create Out of Stock Product
    outOfStockProduct = await Product.create({
      sku: `SKU-OOS-${Date.now()}`,
      name: 'Sold Out Credenza',
      slug: `sold-out-credenza-${Date.now()}`,
      category: 'Storage',
      price: 28000,
      stock: 0,
      inStock: false,
      isActive: true,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2',
    });

    // 5. Create Inactive Product
    inactiveProduct = await Product.create({
      sku: `SKU-INACT-${Date.now()}`,
      name: 'Discontinued Velvet Bench',
      slug: `discontinued-velvet-bench-${Date.now()}`,
      category: 'Seating',
      price: 12000,
      stock: 5,
      inStock: true,
      isActive: false,
      status: 'inactive',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7',
    });

    // 6. Create Valid Coupon
    validCoupon = await Coupon.create({
      code: `LIFECYCLE10_${Date.now()}`,
      type: 'percentage',
      value: 10,
      minimumOrderValue: 5000,
      expiresAt: new Date(Date.now() + 864000000),
      isActive: true,
    });
  });

  afterAll(async () => {
    const userId1 = testUser?._id || testUser?.id;
    const userId2 = secondaryUser?._id || secondaryUser?.id;
    if (userId1) {
      await User.findByIdAndDelete(userId1);
      await Order.deleteMany({ user: userId1 });
      await Notification.deleteMany({ user: userId1 });
    }
    if (userId2) {
      await User.findByIdAndDelete(userId2);
      await Order.deleteMany({ user: userId2 });
      await Notification.deleteMany({ user: userId2 });
    }
    if (activeProduct?._id) await Product.findByIdAndDelete(activeProduct._id);
    if (outOfStockProduct?._id) await Product.findByIdAndDelete(outOfStockProduct._id);
    if (inactiveProduct?._id) await Product.findByIdAndDelete(inactiveProduct._id);
    if (validCoupon?._id) await Coupon.findByIdAndDelete(validCoupon._id);
  });

  // TEST 1: Unauthorized payment/order request
  it('1. POST /api/payments/create-order should reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1 }],
      });

    expect(res.statusCode).toBe(401);
  });

  // TEST 2: Missing / Placeholder Credentials
  it('2. POST /api/payments/create-order should fail safely with 400 when credentials missing', async () => {
    const origKey = process.env.RAZORPAY_KEY_ID;
    process.env.RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID'; // Placeholder key

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Razorpay API keys are not properly configured/i);

    // Restore key
    process.env.RAZORPAY_KEY_ID = origKey;
  });

  // TEST 3: Inactive product handling
  it('3. POST /api/payments/create-order should fail if cart contains an inactive product', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{ id: inactiveProduct._id.toString(), quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  // TEST 4: Insufficient inventory handling
  it('4. POST /api/payments/create-order should fail if product is out of stock', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{ id: outOfStockProduct._id.toString(), quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('OUT_OF_STOCK');
  });

  // TEST 5: Price manipulation attempt
  it('5. POST /api/payments/create-order should reject price manipulation attempt', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1, price: 100 }], // Manipulated price
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PRICE_CHANGED');
  });

  // TEST 6: Invalid signature rejection
  it('6. POST /api/payments/verify should reject invalid Razorpay payment signature', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpayOrderId: 'order_test_9999',
        razorpayPaymentId: 'pay_test_9999',
        razorpaySignature: 'tampered_invalid_signature',
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: 'Jane Doe',
          phone: '9876543210',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PAYMENT_VERIFICATION_FAILED');
  });

  // TEST 7: Successful payment -> order creation & stock decrement
  it('7. POST /api/payments/verify with valid HMAC signature should create order and decrement stock', async () => {
    const razorpayOrderId = `order_${Date.now()}`;
    const razorpayPaymentId = `pay_${Date.now()}`;
    const validSignature = computeSignature(razorpayOrderId, razorpayPaymentId);
    const initialStock = activeProduct.stock;

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
        cartItems: [{ id: activeProduct._id.toString(), quantity: 2 }],
        shippingAddress: {
          fullName: 'Lifecycle Tester',
          phone: '9876543210',
          addressLine1: '456 Atelier Blvd',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
        deliveryMethod: 'standard',
        promoCode: validCoupon.code,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order).toHaveProperty('_id');
    expect(res.body.data.order.payment.status).toBe('paid');
    expect(res.body.data.order.orderStatus).toBe('confirmed');

    createdOrderId = res.body.data.order._id;
    createdOrderNumber = res.body.data.order.orderNumber;

    // Check stock was decremented by 2 (10 -> 8)
    const updatedProd = await Product.findById(activeProduct._id);
    expect(updatedProd.stock).toBe(initialStock - 2);
  });

  // TEST 8: Duplicate payment -> no duplicate order & no double stock decrement
  it('8. POST /api/payments/verify with same payment ID should return existing order without double decrementing stock', async () => {
    const razorpayOrderId = `order_dup_${Date.now()}`;
    const razorpayPaymentId = `pay_dup_${Date.now()}`;
    const validSignature = computeSignature(razorpayOrderId, razorpayPaymentId);

    // Initial Verification
    const res1 = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: 'Lifecycle Tester',
          phone: '9876543210',
          addressLine1: '456 Atelier Blvd',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
      });

    expect(res1.statusCode).toBe(201);
    const orderId1 = res1.body.data.order._id;
    const stockAfterFirst = (await Product.findById(activeProduct._id)).stock;

    // Second Verification with same payment identifiers
    const res2 = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
        cartItems: [{ id: activeProduct._id.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: 'Lifecycle Tester',
          phone: '9876543210',
          addressLine1: '456 Atelier Blvd',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
      });

    expect(res2.statusCode).toBe(201);
    expect(res2.body.data.order._id).toBe(orderId1);

    // Verify stock was NOT decremented a second time
    const stockAfterSecond = (await Product.findById(activeProduct._id)).stock;
    expect(stockAfterSecond).toBe(stockAfterFirst);
  });

  // TEST 9: Order retrieval for authenticated user
  it('9. GET /api/orders should return list of orders for logged-in user', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
  });

  // TEST 10: Order details & tracking data
  it('10. GET /api/orders/:id should return order details and status tracking history', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order._id).toBe(createdOrderId);
    expect(res.body.data.order.orderNumber).toBe(createdOrderNumber);
    expect(res.body.data.order.orderStatus).toBe('confirmed');
    expect(Array.isArray(res.body.data.order.statusHistory)).toBe(true);
    expect(res.body.data.order.statusHistory.length).toBeGreaterThanOrEqual(1);
  });

  // TEST 11: Notification creation after payment success
  it('11. GET /api/notifications should return order confirmation notification', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const notifs = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.notifications || []);
    expect(Array.isArray(notifs)).toBe(true);
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  // TEST 12: Invalid order/user access
  it('12. GET /api/orders/:id should return 404 when requested by another user', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${secondaryUserToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Order not found or unauthorized access/i);
  });
});
