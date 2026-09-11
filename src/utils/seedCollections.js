const mongoose = require('mongoose');
const env = require('../config/env');
const Product = require('../models/Product');
const Collection = require('../models/Collection');

const seedCollectionsData = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.mongoUri);
    }
    console.log('🌱 Seeding Collections Data...');

    const products = await Product.find({ isActive: true });
    if (products.length === 0) {
      console.log('⚠️ No products found in MongoDB. Seed products first.');
      return;
    }

    const pMap = {};
    products.forEach((p) => {
      pMap[p.slug] = p._id;
    });

    const getP = (slug, index = 0) => pMap[slug] || products[index % products.length]._id;

    const collectionsData = [
      {
        name: 'The Warm Minimal Collection',
        slug: 'warm-minimal',
        description: 'Clean silhouettes softened by tactile bouclé, natural oak, and warm ceramic textures.',
        coverImage: '/images/collections/warm-minimal.jpg',
        products: [getP('modern-lounge-sofa', 0), getP('oak-coffee-table', 1), getP('minimalist-floor-lamp', 2)],
        roomTypes: ['Living Room', 'Bedroom'],
        styles: ['Minimal', 'Modern'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Scandinavian Calm Collection',
        slug: 'scandinavian-calm',
        description: 'Light tones, organic curves, and airy wooden craftsmanship designed for peaceful modern living.',
        coverImage: '/images/collections/scandinavian-calm.jpg',
        products: [getP('minimal-floor-lamp', 0), getP('natural-jute-rug', 1), getP('solid-oak-credenza', 2)],
        roomTypes: ['Dining Room', 'Balcony'],
        styles: ['Scandinavian', 'Boho'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Japandi Essentials',
        slug: 'japandi-essentials',
        description: 'Wabi-sabi simplicity paired with ergonomic Japanese-Nordic design principles.',
        coverImage: '/images/collections/japandi-essentials.jpg',
        products: [getP('walnut-writing-desk', 6), getP('ergonomic-office-chair', 7)],
        roomTypes: ['Workspace', 'Living Room'],
        styles: ['Japandi', 'Minimal'],
        isFeatured: true,
        isActive: true,
      },
    ];

    let seededCount = 0;
    for (const col of collectionsData) {
      await Collection.findOneAndUpdate({ slug: col.slug }, col, { upsert: true, new: true });
      seededCount++;
    }
    console.log(`✅ ${seededCount} Collections seeded successfully.`);

  } catch (err) {
    console.error('❌ Error seeding Collections data:', err);
  }
};

if (require.main === module) {
  seedCollectionsData().then(() => {
    console.log('Collections seed completed.');
    process.exit(0);
  });
}

module.exports = seedCollectionsData;
