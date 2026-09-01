const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const { memoryOrders } = require('../src/services/adminOrderService');
const productService = require('../src/services/productService');

jest.setTimeout(15000);

describe('Admin Analytics & Business Intelligence API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9e111';
  const adminId = '65f1a2b3c4d5e6f7a8b9e222';
  const productId = '65f1a2b3c4d5e6f7a8b9e333';
  const orderId = '65f1a2b3c4d5e6f7a8b9e444';

  let customerToken;
  let adminToken;

  const testCustomer = {
    _id: new mongoose.Types.ObjectId(customerId),
    id: customerId,
    firstName: 'Analytics',
    lastName: 'User',
    email: 'analytics_customer@nestora.com',
    role: 'user',
    status: 'active',
    createdAt: new Date(),
  };

  const testAdmin = {
    _id: new mongoose.Types.ObjectId(adminId),
    id: adminId,
    firstName: 'Analytics',
    lastName: 'Admin',
    email: 'analytics_admin@nestora.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date(),
  };

  const testProduct = {
    _id: new mongoose.Types.ObjectId(productId),
    customId: productId,
    name: 'Teak Lounge Chair',
    category: 'Furniture',
    price: 35000,
    stock: 10,
    lowStockThreshold: 5,
  };

  const testOrder = {
    _id: new mongoose.Types.ObjectId(orderId),
    id: orderId,
    orderNumber: 'NST-20260819-7777',
    user: new mongoose.Types.ObjectId(customerId),
    items: [
      {
        product: new mongoose.Types.ObjectId(productId),
        name: 'Teak Lounge Chair',
        price: 35000,
        quantity: 2,
        image: 'https://example.com/chair.jpg',
      },
    ],
    subtotal: 70000,
    total: 70000,
    payment: {
      provider: 'razorpay',
      status: 'paid',
      transactionId: 'pay_test7777',
    },
    orderStatus: 'delivered',
    createdAt: new Date(),
  };

  beforeAll(async () => {
    memoryUsers[customerId] = testCustomer;
    memoryUsers[adminId] = testAdmin;

    if (memoryOrders) {
      memoryOrders[orderId] = testOrder;
    }
    if (productService.memoryProducts) {
      productService.memoryProducts.push(testProduct);
    }

    if (User.db.readyState === 1) {
      await User.deleteMany({ email: { $in: ['analytics_customer@nestora.com', 'analytics_admin@nestora.com'] } });
      await User.create(testCustomer);
      await User.create(testAdmin);

      await Product.deleteMany({ _id: testProduct._id });
      await Product.create(testProduct);

      await Order.deleteMany({ _id: testOrder._id });
      await Order.create(testOrder);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  // 1. UNAUTHENTICATED ACCESS REJECTION
  it('1. GET /api/admin/analytics/overview should reject unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/admin/analytics/overview');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 2. CUSTOMER ACCESS REJECTION
  it('2. GET /api/admin/analytics/overview should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 3. OVERVIEW METRICS FOR ADMIN
  it('3. GET /api/admin/analytics/overview should return overview metrics for admin', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/overview?period=30d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRevenue).toBeDefined();
    expect(res.body.data.averageOrderValue).toBeDefined();
    expect(res.body.data.totalOrders).toBeDefined();
  });

  // 4. SALES CHART & STATUS DISTRIBUTION
  it('4. GET /api/admin/analytics/sales should return sales chart and fulfillment distribution', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/sales?period=30d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sales)).toBe(true);
    expect(res.body.data.distribution).toBeDefined();
  });

  // 5. TOP PRODUCTS ANALYTICS
  it('5. GET /api/admin/analytics/top-products should return bestselling products', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/top-products?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 6. CATEGORY PERFORMANCE ANALYTICS
  it('6. GET /api/admin/analytics/categories should return category revenue breakdown', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/categories?period=30d')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 7. CUSTOM DATE RANGE VALIDATION
  it('7. GET /api/admin/analytics/overview with invalid custom date range should return 400', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/overview?period=custom&startDate=2026-12-31&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
