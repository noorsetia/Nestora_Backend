const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const InventoryLog = require('../src/models/InventoryLog');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const inventoryService = require('../src/services/inventoryService');
const productService = require('../src/services/productService');

jest.setTimeout(15000);

describe('Admin Inventory Management API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9d111';
  const adminId = '65f1a2b3c4d5e6f7a8b9d222';
  const targetProductId = '65f1a2b3c4d5e6f7a8b9d333';

  let customerToken;
  let adminToken;

  beforeAll(async () => {
    const customerUser = {
      _id: new mongoose.Types.ObjectId(customerId),
      id: customerId,
      firstName: 'Customer',
      lastName: 'User',
      email: 'inv_customer@nestora.com',
      role: 'user',
      status: 'active',
    };

    const adminUser = {
      _id: new mongoose.Types.ObjectId(adminId),
      id: adminId,
      firstName: 'Inventory',
      lastName: 'Admin',
      email: 'inv_admin@nestora.com',
      role: 'admin',
      status: 'active',
    };

    const testProduct = {
      _id: new mongoose.Types.ObjectId(targetProductId),
      customId: targetProductId,
      name: 'Oak Minimal Dining Table',
      sku: 'NST-TBL-OAK-001',
      brand: 'Nestora Atelier',
      category: 'Tables',
      price: 45000,
      stock: 15,
      lowStockThreshold: 5,
      status: 'active',
      isActive: true,
      image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80',
    };

    memoryUsers[customerId] = customerUser;
    memoryUsers[adminId] = adminUser;
    if (productService.memoryProducts) {
      productService.memoryProducts.push(testProduct);
    }

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['inv_customer@nestora.com', 'inv_admin@nestora.com'] },
      });
      await User.create(customerUser);
      await User.create(adminUser);

      await Product.deleteMany({ sku: 'NST-TBL-OAK-001' });
      await Product.create(testProduct);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  // 1. INVENTORY LISTING
  it('1. GET /api/inventory should return inventory listing with summary metrics for admin', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inventory).toBeDefined();
    expect(Array.isArray(res.body.data.inventory)).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  // 2. SEARCH / FILTER
  it('2. GET /api/inventory should filter inventory by search query', async () => {
    const res = await request(app)
      .get('/api/inventory?search=chair')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inventory).toBeDefined();
  });

  it('3. GET /api/inventory should filter inventory by status (low_stock)', async () => {
    const res = await request(app)
      .get('/api/inventory?status=low_stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. ADMIN STOCK INCREASE
  it('4. PATCH /api/inventory/:productId should increase stock for valid admin', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'increase',
        quantity: 5,
        reason: 'Restock shipment received',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newStock).toBeDefined();
  });

  // 4. ADMIN STOCK DECREASE
  it('5. PATCH /api/inventory/:productId should decrease stock for valid admin', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'decrease',
        quantity: 2,
        reason: 'Damage inspection discard',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 5. SET EXACT STOCK
  it('6. PATCH /api/inventory/:productId should set exact stock for valid admin', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'set',
        quantity: 25,
        reason: 'Audit correction',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newStock).toBe(25);
  });

  // 6. NEGATIVE QUANTITY REJECTION
  it('7. PATCH /api/inventory/:productId should reject negative quantity input with 400', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'increase',
        quantity: -10,
        reason: 'Invalid negative test',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 7. NEGATIVE RESULTING STOCK PREVENTION
  it('8. PATCH /api/inventory/:productId should reject stock decrease greater than current stock with 400', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'decrease',
        quantity: 9999,
        reason: 'Excessive decrease attempt',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 8. UNAUTHORIZED CUSTOMER ACCESS
  it('9. GET /api/inventory should reject customer access with 403', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('10. PATCH /api/inventory/:productId should reject customer mutation with 403', async () => {
    const productId = targetProductId;
    const res = await request(app)
      .patch(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        operation: 'increase',
        quantity: 10,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 9. INVENTORY LOG CREATION
  it('11. GET /api/inventory/logs should return recorded inventory logs for admin', async () => {
    const res = await request(app)
      .get('/api/inventory/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  // 10. INVALID PRODUCT ID
  it('12. PATCH /api/inventory/:productId should return clean error for invalid product ID format', async () => {
    const res = await request(app)
      .patch('/api/inventory/invalid-id-xyz')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operation: 'increase',
        quantity: 5,
      });

    expect([400, 404]).toContain(res.statusCode);
    expect(res.body.success).toBe(false);
  });

  // 11. LOW-STOCK DETECTION
  it('13. GET /api/inventory/low-stock should return items at or below low stock threshold', async () => {
    const res = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeDefined();
  });
});
