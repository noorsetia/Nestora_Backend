const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/generateToken');
const { memoryUsers } = require('../src/services/authService');
const cloudinaryService = require('../src/services/cloudinaryService');

jest.setTimeout(15000);

describe('Cloudinary Image Upload API Suite', () => {
  const customerId = '65f1a2b3c4d5e6f7a8b9c111';
  const adminId = '65f1a2b3c4d5e6f7a8b9c222';

  let customerToken;
  let adminToken;

  beforeAll(async () => {
    const customerUser = {
      _id: new mongoose.Types.ObjectId(customerId),
      id: customerId,
      firstName: 'Customer',
      lastName: 'User',
      email: 'upload_customer@nestora.com',
      role: 'user',
      status: 'active',
    };

    const adminUser = {
      _id: new mongoose.Types.ObjectId(adminId),
      id: adminId,
      firstName: 'Upload',
      lastName: 'Admin',
      email: 'upload_admin@nestora.com',
      role: 'admin',
      status: 'active',
    };

    memoryUsers[customerId] = customerUser;
    memoryUsers[adminId] = adminUser;

    if (User.db.readyState === 1) {
      await User.deleteMany({
        email: { $in: ['upload_customer@nestora.com', 'upload_admin@nestora.com'] },
      });
      await User.create(customerUser);
      await User.create(adminUser);
    }

    customerToken = generateToken(customerId, 'user');
    adminToken = generateToken(adminId, 'admin');
  });

  it('1. POST /api/products/upload should reject unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/products/upload');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. POST /api/products/upload should reject non-admin requests with 403', async () => {
    const res = await request(app)
      .post('/api/products/upload')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. POST /api/products/upload should reject requests with no image file attached with 400', async () => {
    const res = await request(app)
      .post('/api/products/upload')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No image file uploaded/i);
  });

  it('4. POST /api/products/upload should reject non-image file types (e.g. .txt) with 400', async () => {
    const res = await request(app)
      .post('/api/products/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', Buffer.from('plain text content'), 'test.txt');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('5. POST /api/products/upload should upload image to Cloudinary and return secure Cloudinary URL', async () => {
    const mockCloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1700000000/nestora/products/sample_product.jpg';
    jest.spyOn(cloudinaryService, 'uploadToCloudinary').mockResolvedValue({
      url: mockCloudinaryUrl,
      public_id: 'nestora/products/sample_product',
      format: 'jpg',
      width: 1200,
      height: 1500,
    });

    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/products/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', dummyImageBuffer, 'sample_product.jpg');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBe(mockCloudinaryUrl);
    expect(res.body.data.public_id).toBe('nestora/products/sample_product');

    cloudinaryService.uploadToCloudinary.mockRestore();
  });
});
