const mongoose = require('mongoose');
const env = require('../config/env');
const Product = require('../models/Product');
const RoomSet = require('../models/RoomSet');
const Article = require('../models/Article');
const Collection = require('../models/Collection');

const seedPhase11Data = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.mongoUri);
    }
    console.log('🌱 Seeding Phase 11 Experience Data...');

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

    // 1. Seed Room Sets
    const roomSetsData = [
      {
        name: 'The Architectural Living Room',
        slug: 'modern-living-room',
        roomType: 'Living Room',
        style: 'Modern',
        description: 'An expansive space anchored by clean silhouettes, tactile linens, and sculptural illumination.',
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
        hotspots: [
          { product: getP('modern-lounge-sofa', 0), position: { top: 62, left: 45 }, hotspotLabel: 'Modern Lounge Sofa' },
          { product: getP('oak-coffee-table', 1), position: { top: 75, left: 52 }, hotspotLabel: 'Solid Oak Coffee Table' },
          { product: getP('minimalist-floor-lamp', 2), position: { top: 35, left: 82 }, hotspotLabel: 'Brass Arch Floor Lamp' },
          { product: getP('wool-accent-chair', 3), position: { top: 58, left: 22 }, hotspotLabel: 'Bouclé Lounge Chair' },
        ],
        totalPrice: 84999,
        isFeatured: true,
      },
      {
        name: 'Sanctuary Master Bedroom',
        slug: 'cozy-bedroom',
        roomType: 'Bedroom',
        style: 'Minimal',
        description: 'Serene low-profile wooden bed framed by muted linen bedding and warm pendant lighting.',
        image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1600&q=80',
        hotspots: [
          { product: getP('velvet-bed-frame', 4), position: { top: 55, left: 50 }, hotspotLabel: 'Platform Upholstered Bed' },
          { product: getP('ceramic-table-lamp', 5), position: { top: 40, left: 25 }, hotspotLabel: 'Textured Ceramic Bedside Lamp' },
          { product: getP('natural-jute-rug', 6), position: { top: 80, left: 48 }, hotspotLabel: 'Hand-Woven Jute Rug' },
        ],
        totalPrice: 62500,
        isFeatured: true,
      },
      {
        name: 'Focus Executive Workspace',
        slug: 'minimal-workspace',
        roomType: 'Workspace',
        style: 'Japandi',
        description: 'Distraction-free environment built with organic walnut grain, ergonomic leather seating, and task light.',
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
        hotspots: [
          { product: getP('walnut-writing-desk', 7), position: { top: 52, left: 48 }, hotspotLabel: 'Solid Walnut Writing Desk' },
          { product: getP('ergonomic-office-chair', 8), position: { top: 58, left: 58 }, hotspotLabel: 'Leather Executive Task Chair' },
        ],
        totalPrice: 42000,
        isFeatured: true,
      },
      {
        name: 'Nordic Dining Atelier',
        slug: 'scandinavian-dining',
        roomType: 'Dining Room',
        style: 'Scandinavian',
        description: 'Light oak expandable dining table surrounded by curved wooden dining chairs for intimate dinners.',
        image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1600&q=80',
        hotspots: [
          { product: getP('oak-dining-table', 9), position: { top: 60, left: 50 }, hotspotLabel: 'Solid Oak Dining Table' },
          { product: getP('scandinavian-pendant-light', 10), position: { top: 25, left: 50 }, hotspotLabel: 'Matte Dome Pendant' },
        ],
        totalPrice: 58999,
        isFeatured: true,
      },
      {
        name: 'Sunlit Evening Balcony',
        slug: 'warm-balcony',
        roomType: 'Balcony',
        style: 'Boho',
        description: 'Weather-resistant teak lounge set paired with terracotta planters and ambient string lanterns.',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
        hotspots: [
          { product: getP('outdoor-teak-bench', 11), position: { top: 65, left: 45 }, hotspotLabel: 'Outdoor Teak Lounge Bench' },
        ],
        totalPrice: 28500,
        isFeatured: true,
      },
    ];

    for (const rs of roomSetsData) {
      await RoomSet.findOneAndUpdate({ slug: rs.slug }, rs, { upsert: true, new: true });
    }
    console.log('✅ Room Sets seeded.');

    // 2. Seed Articles for Inspiration Journal
    const articlesData = [
      {
        title: '5 Ways to Create a Calm & Intentional Master Bedroom',
        slug: '5-ways-to-create-a-calm-bedroom',
        category: 'Room Ideas',
        excerpt: 'How to curate peaceful sleep sanctuaries using organic textiles, low lighting, and uncluttered silhouettes.',
        content: `Your bedroom should be the ultimate refuge from the noisy digital world. By focusing on sensory warmth, natural materials, and balanced proportions, you can transform your space into a restorative sanctuary.

1. Embrace Low-Profile Platform Beds
Grounding your sleeping area with a low wooden frame draws the eyes downward, giving the ceiling an illusion of extra height and openness.

2. Soft Layering with Linen & Bouclé
Opt for breathable linen bedding in warm alabaster, oatmeal, or washed terracottas. Layer a ribbed wool throw across the foot of the bed.

3. Dimmable Warm Illumination
Avoid harsh overhead lights. Position ceramic base lamps or adjustable brass sconces at eye level for soft evening reading ambiance.

4. Keep Nightstands Minimal
Limit surface clutter to a single ceramic coaster, your favorite book, and a small amber glass vessel for water.

5. Integrate Tactile Natural Rugs
Stepping onto hand-woven wool or natural jute in the morning anchors your routine in earthy comfort.`,
        coverImage: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
        tags: ['Bedroom', 'Minimalism', 'Interior Tips', 'Wellness'],
        readTime: '6 min read',
        relatedProducts: [getP('velvet-bed-frame', 0), getP('ceramic-table-lamp', 1)],
        relatedRooms: ['Bedroom'],
        isPublished: true,
      },
      {
        title: 'The Rise of Warm Japandi Design in Modern Urban Homes',
        slug: 'rise-of-warm-japandi-design',
        category: 'Interior Trends',
        excerpt: 'Exploring the fusion of Scandinavian functionality and Japanese wabi-sabi aesthetics.',
        content: `Japandi interior design combines the cozy simplicity of Nordic hygge with the rustic grace of Japanese wabi-sabi. It prioritizes craft, texture, and objects that age gracefully.

Key Principles:
- Muted organic palette: Charcoal, sand, sage, and pale oak.
- Craftsmanship over mass production.
- Multi-functional, low-slung furniture.
- Embracing imperfect stone and hand-thrown pottery.`,
        coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
        tags: ['Japandi', 'Trends', 'Craftsmanship', 'Architecture'],
        readTime: '8 min read',
        relatedProducts: [getP('walnut-writing-desk', 2), getP('oak-coffee-table', 3)],
        relatedRooms: ['Living Room', 'Workspace'],
        isPublished: true,
      },
      {
        title: 'Small Space Magic: Designing High-Impact Compact Workspaces',
        slug: 'small-space-magic-workspaces',
        category: 'Small Spaces',
        excerpt: 'Clever layouts, floating storage, and ergonomic lighting that turn tiny nooks into executive productivity hubs.',
        content: `Working from home does not require an entire spare room. With deliberate spatial planning, vertical shelving, and slim-profile oak desks, any apartment corner can feel like an executive study.`,
        coverImage: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
        tags: ['Workspace', 'Small Spaces', 'Storage'],
        readTime: '4 min read',
        relatedProducts: [getP('ergonomic-office-chair', 4)],
        relatedRooms: ['Workspace'],
        isPublished: true,
      },
      {
        title: 'Mastering the Art of Layered Room Illumination',
        slug: 'mastering-layered-room-illumination',
        category: 'Styling Guides',
        excerpt: 'Why single ceiling fixtures ruin room mood, and how ambient, task, and accent lighting create architectural depth.',
        content: `Lighting is the silent sculptor of architecture. Learn how to combine arch floor lamps, wall washers, and tabletop ceramic fixtures to create dynamic warmth in every corner.`,
        coverImage: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
        tags: ['Lighting', 'Styling', 'Atmosphere'],
        readTime: '5 min read',
        relatedProducts: [getP('minimalist-floor-lamp', 5), getP('scandinavian-pendant-light', 6)],
        relatedRooms: ['Living Room', 'Dining Room'],
        isPublished: true,
      },
      {
        title: 'Sculptural Dining: Setting the Stage for Memorable Evenings',
        slug: 'sculptural-dining-setting-the-stage',
        category: 'Design Tips',
        excerpt: 'Curating dining spaces that encourage slow conversations, shared meals, and timeless tactile hospitality.',
        content: `A dining room is more than a place to eat—it is an anchor for gatherings. Pair solid wood expandable tables with curved armchairs and warm dimmable pendants.`,
        coverImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
        tags: ['Dining', 'Hosting', 'Furniture'],
        readTime: '7 min read',
        relatedProducts: [getP('oak-dining-table', 7)],
        relatedRooms: ['Dining Room'],
        isPublished: true,
      },
    ];

    for (const art of articlesData) {
      await Article.findOneAndUpdate({ slug: art.slug }, art, { upsert: true, new: true });
    }
    console.log('✅ Articles seeded.');

    // 3. Seed Collections
    const collectionsData = [
      {
        name: 'The Warm Minimal Collection',
        slug: 'warm-minimal',
        description: 'Clean silhouettes softened by tactile bouclé, natural oak, and warm ceramic textures.',
        coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
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
        coverImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
        products: [getP('oak-dining-table', 3), getP('scandinavian-pendant-light', 4), getP('natural-jute-rug', 5)],
        roomTypes: ['Dining Room', 'Balcony'],
        styles: ['Scandinavian', 'Boho'],
        isFeatured: true,
        isActive: true,
      },
      {
        name: 'Japandi Essentials',
        slug: 'japandi-essentials',
        description: 'Wabi-sabi simplicity paired with ergonomic Japanese-Nordic design principles.',
        coverImage: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
        products: [getP('walnut-writing-desk', 6), getP('ergonomic-office-chair', 7)],
        roomTypes: ['Workspace', 'Living Room'],
        styles: ['Japandi', 'Minimal'],
        isFeatured: true,
        isActive: true,
      },
    ];

    for (const col of collectionsData) {
      await Collection.findOneAndUpdate({ slug: col.slug }, col, { upsert: true, new: true });
    }
    console.log('✅ Collections seeded successfully.');

  } catch (err) {
    console.error('❌ Error seeding Phase 11 data:', err);
  }
};

if (require.main === module) {
  seedPhase11Data().then(() => {
    console.log('Phase 11 seed completed.');
    process.exit(0);
  });
}

module.exports = seedPhase11Data;
