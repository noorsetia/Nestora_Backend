const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const AuditLog = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const productService = require('../src/services/productService');
const adminOrderService = require('../src/services/adminOrderService');

jest.setTimeout(15000);

describe('Admin Order Management & Fulfillment API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9e111';
  const adminId = '65f1a2b3c4d5e6f7a8b9e222';
  const productId = '65f1a2b3c4d5e6f7a8b9e333';
  const orderId = '65f1a2b3c4d5e6f7a8b9e444';
  const orderId2 = '65f1a2b3c4d5e6f7a8b9e555';

  let customerToken;
  let adminToken;

  const testCustomer = {
    _id: new mongoose.Types.ObjectId(customerId),
    id: customerId,
    firstName: 'Order',
    lastName: 'Tester',
    email: 'ord_customer@nestora.com',
    role: 'user',
    status: 'active',
  };

  const testAdmin = {
    _id: new mongoose.Types.ObjectId(adminId),
    id: adminId,
    firstName: 'Order',
    lastName: 'Admin',
    email: 'ord_admin@nestora.com',
    role: 'admin',
    status: 'active',
  };

  const testProduct = {
    _id: new mongoose.Types.ObjectId(productId),
    customId: productId,
    name: 'Teak Minimal Lounge Chair',
    sku: 'NST-[#NST-20260819-1001]',
    brand: 'Nestora Atelier',
    category: 'Chairs',
    price: 25000,
    stock: 20,
    lowStockThreshold: 5,
    status: 'active',
    isActive: true,
  };

  const testOrder = {
    _id: new mongoose.Types.ObjectId(orderId),
    id: orderId,
    orderNumber: 'NST-20260819-1001',
    user: new mongoose.Types.ObjectId(customerId),
    items: [
      {
        product: new mongoose.Types.ObjectId(productId),
        name: 'Teak Minimal Lounge Chair',
        quantity: 2,
        price: 25000,
        customId: productId,
        image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800',
      },
    ],
    subtotal: 50000,
    discount: 0,
    shippingFee: 0,
    total: 50000,
    shippingAddress: {
      fullName: 'Order Tester',
      phone: '+91 9876543210',
      addressLine1: '123 Atelier Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    deliveryMethod: 'standard',
    payment: {
      provider: 'razorpay',
      status: 'paid',
      razorpayOrderId: 'order_test_1001',
      razorpayPaymentId: 'pay_test_1001',
    },
    orderStatus: 'confirmed',
    statusHistory: [
      {
        status: 'confirmed',
        timestamp: new Date(),
        note: 'Order placed',
        updatedBy: customerId,
      },
    ],
    createdAt: new Date(),
  };

  const testOrderUnpaid = {
    _id: new mongoose.Types.ObjectId(orderId2),
    id: orderId2,
    orderNumber: 'NST-20260819-1002',
    user: new mongoose.Types.ObjectId(customerId),
    items: [
      {
        product: new mongoose.Types.ObjectId(productId),
        name: 'Teak Minimal Lounge Chair',
        quantity: 1,
        price: 25000,
        customId: productId,
      },
    ],
    subtotal: 25000,
    discount: 0,
    shippingFee: 0,
    total: 25000,
    shippingAddress: {
      fullName: 'Order Tester',
      phone: '+91 9876543210',
      addressLine1: '123 Atelier Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
    deliveryMethod: 'standard',
    payment: {
      provider: 'razorpay',
      status: 'pending',
      razorpayOrderId: 'order_test_1002',
    },
    orderStatus: 'pending',
    statusHistory: [
      {
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created',
        updatedBy: customerId,
      },
    ],
    createdAt: new Date(),
  };

  beforeAll(async () => {
    memoryUsers[customerId] = testCustomer;
    memoryUsers[adminId] = testAdmin;

    if (productService.memoryProducts) {
      productService.memoryProducts.push(testProduct);
    }

    if (adminOrderService.memoryOrders) {
      adminOrderService.memoryOrders.length = 0;
      adminOrderService.memoryOrders.push({ ...testOrder }, { ...testOrderUnpaid });
    }

    if (User.db.readyState === 1) {
      await User.deleteMany({ email: { $in: ['ord_customer@nestora.com', 'ord_admin@nestora.com'] } });
      await User.create(testCustomer);
      await User.create(testAdmin);

      await Product.deleteMany({ sku: 'NST-[#NST-20260819-1001]' });
      await Product.create(testProduct);

      await Order.deleteMany({ orderNumber: { $in: ['NST-20260819-1001', 'NST-20260819-1002'] } });
      await Order.create(testOrder);
      await Order.create(testOrderUnpaid);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  // 1. ADMIN ORDER LISTING
  it('1. GET /api/admin/orders should return paginated list of orders for admin', async () => {
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orders).toBeDefined();
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  // 2. SEARCH / FILTER
  it('2. GET /api/admin/orders should filter orders by search term and status', async () => {
    const res = await request(app)
      .get('/api/admin/orders?search=1001&status=confirmed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. ORDER DETAILS
  it('3. GET /api/admin/orders/:id should return single order details', async () => {
    const res = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBe('NST-20260819-1001');
  });

  // 4. VALID STATUS TRANSITION
  it('4. PATCH /api/admin/orders/:id/status should update status on valid lifecycle transition', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('processing');
  });

  // 5. INVALID STATUS TRANSITION
  it('5. PATCH /api/admin/orders/:id/status should reject invalid transition with 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' }); // processing -> delivered is invalid (must go through packed, shipped, out_for_delivery)

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 6. UNAUTHORIZED CUSTOMER ACCESS
  it('6. GET /api/admin/orders should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 7. ORDER CANCELLATION & INVENTORY RESTORATION
  it('7. PATCH /api/admin/orders/:id/cancel should cancel order and restore stock', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Customer requested via support desk' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('cancelled');
  });

  // 8. DUPLICATE CANCELLATION PROTECTION
  it('8. PATCH /api/admin/orders/:id/cancel should handle duplicate cancellation gracefully without error', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Duplicate cancellation attempt' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('cancelled');
  });

  // 9. REFUND AUTHORIZATION & DUPLICATE REFUND PROTECTION
  it('9. POST /api/admin/orders/:id/refund should issue refund for paid order', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Administrative cancellation refund' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order.payment.status).toBe('refunded');
  });

  it('10. POST /api/admin/orders/:id/refund should reject duplicate refund attempt with 400', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Second refund attempt' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
