const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');

jest.setTimeout(15000);

describe('Product & Category Admin Management API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9c111';
  const adminId = '65f1a2b3c4d5e6f7a8b9c222';

  let customerToken;
  let adminToken;
  let createdProductId;
  let createdCategoryId;

  beforeAll(async () => {
    const customerUser = {
      _id: new mongoose.Types.ObjectId(customerId),
      id: customerId,
      firstName: 'Customer',
      lastName: 'User',
      email: 'cat_customer@nestora.com',
      role: 'user',
      status: 'active',
    };

    const adminUser = {
      _id: new mongoose.Types.ObjectId(adminId),
      id: adminId,
      firstName: 'Catalog',
      lastName: 'Admin',
      email: 'cat_admin@nestora.com',
      role: 'admin',
      status: 'active',
    };

    memoryUsers[customerId] = customerUser;
    memoryUsers[adminId] = adminUser;

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['cat_customer@nestora.com', 'cat_admin@nestora.com'] },
      });
      await User.create(customerUser);
      await User.create(adminUser);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  // 1. PRODUCT LISTING
  it('1. GET /api/products should return paginated catalog', async () => {
    const res = await request(app).get('/api/products?page=1&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data).toHaveProperty('pagination');
  });

  it('2. GET /api/products should filter products by query search', async () => {
    const res = await request(app).get('/api/products?search=chair');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 2. PRODUCT CREATION
  it('3. POST /api/products should create product when requested by authorized admin', async () => {
    const payload = {
      name: 'Nordic Walnut Desk',
      brand: 'Nestora Atelier',
      category: 'Tables',
      price: 34999,
      originalPrice: 39999,
      stock: 8,
      lowStockThreshold: 3,
      image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80',
      description: 'Solid American walnut executive desk.',
      rooms: ['Workspace', 'Living Room'],
      styles: ['Minimal', 'Nordic'],
      status: 'active',
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product).toBeDefined();
    expect(res.body.data.product.name).toBe('Nordic Walnut Desk');
    expect(res.body.data.product.price).toBe(34999);
    createdProductId = res.body.data.product._id || res.body.data.product.id || res.body.data.product.customId;
  });

  // 3. PRODUCT UPDATE
  it('4. PUT /api/products/:id should update product specs when requested by admin', async () => {
    const targetId = createdProductId || 'prod-1';
    const updatePayload = {
      name: 'Nordic Walnut Desk (Updated)',
      price: 32999,
      stock: 12,
    };

    const res = await request(app)
      .put(`/api/products/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.name).toBe('Nordic Walnut Desk (Updated)');
    expect(res.body.data.product.price).toBe(32999);
  });

  // 4. INVALID PRODUCT DATA
  it('5. POST /api/products should reject invalid product data with 400', async () => {
    const invalidPayload = {
      name: '',
      price: -500, // Negative price
      category: '',
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidPayload);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  // 5. UNAUTHORIZED PRODUCT MUTATION
  it('6. POST /api/products should reject customer product creation with 403', async () => {
    const payload = {
      name: 'Unauthorized Chair',
      category: 'Seating',
      price: 1999,
      image: 'https://example.com/img.jpg',
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('7. DELETE /api/products/:id should reject unauthenticated requests with 401', async () => {
    const res = await request(app).delete('/api/products/prod-1');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 6. CATEGORY CREATION
  it('8. POST /api/categories should create a category when requested by admin', async () => {
    const payload = {
      name: 'Architectural Lighting',
      slug: 'architectural-lighting',
      description: 'Precision engineered ceiling and floor lights.',
      isActive: true,
    };

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBeDefined();
    expect(res.body.data.category.name).toBe('Architectural Lighting');
    createdCategoryId = res.body.data.category._id || res.body.data.category.id;
  });

  // 7. CATEGORY UPDATE
  it('9. PUT /api/categories/:id should update category details when requested by admin', async () => {
    if (!createdCategoryId) return;
    const updatePayload = {
      description: 'Updated precision engineered ambient lighting collection.',
    };

    const res = await request(app)
      .put(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category.description).toBe(updatePayload.description);
  });

  // 8. SAFE CATEGORY DELETION
  it('10. DELETE /api/categories/:id should safely handle category deletion', async () => {
    // Attempt deleting a category that has items (e.g. "Furniture")
    let targetCatId = createdCategoryId;
    
    if (Category.db.readyState === 1) {
      const furnitureCat = await Category.findOne({ name: 'Furniture' });
      if (furnitureCat) targetCatId = furnitureCat._id;
    }

    if (!targetCatId) targetCatId = 'cat-test';

    const res = await request(app)
      .delete(`/api/categories/${targetCatId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 9. UNAUTHORIZED CATEGORY MUTATION
  it('11. POST /api/categories should reject customer category creation with 403', async () => {
    const payload = {
      name: 'Unauthorized Category',
    };

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
