const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const User = require('../models/User');

const seedPhase10Data = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nestora';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for Phase 10 seeding...');

    // Seed Coupons
    const existingCoupons = await Coupon.countDocuments();
    if (existingCoupons === 0) {
      await Coupon.create([
        {
          code: 'NESTORA10',
          description: '10% OFF on all luxury furniture and decor pieces',
          type: 'percentage',
          value: 10,
          minimumOrderValue: 0,
          maximumDiscount: 5000,
          usageLimit: 500,
          usedCount: 42,
          perUserLimit: 2,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          isActive: true,
        },
        {
          code: 'WELCOME500',
          description: 'Flat ₹500 OFF on orders above ₹2,000 for new spatial designers',
          type: 'fixed',
          value: 500,
          minimumOrderValue: 2000,
          maximumDiscount: 500,
          usageLimit: 1000,
          usedCount: 128,
          perUserLimit: 1,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        {
          code: 'ATELIER20',
          description: '20% OFF Exclusive Atelier Seating Collection',
          type: 'percentage',
          value: 20,
          minimumOrderValue: 15000,
          maximumDiscount: 10000,
          usageLimit: 100,
          usedCount: 15,
          perUserLimit: 1,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ]);
      console.log('[Seed] Initial coupons seeded successfully!');
    }

    console.log('[Seed] Phase 10 seeding complete.');
  } catch (err) {
    console.error('[Seed Error]', err.message);
  } finally {
    mongoose.connection.close();
  }
};

seedPhase10Data();
