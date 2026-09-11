const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const initialCategories = [
  {
    name: 'Furniture',
    slug: 'furniture',
    description: 'Artisanal seating, tables, and architectural living statements',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Seating',
    slug: 'seating',
    description: 'Tactile lounge chairs, plush sofas, and sculptured accents',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Tables',
    slug: 'tables',
    description: 'Honed travertine dining surfaces and low-profile solid oak tables',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    description: 'Slender brass floor stems and wheel-thrown ceramic luminaires',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Decor',
    slug: 'decor',
    description: 'Honed stoneware, sculptured vessels, and architectural accents',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Rugs',
    slug: 'rugs',
    description: 'Hand-loomed organic fibers and tactile un-dyed jute weaves',
    image: '/images/collections/living-room.jpg',
  },
  {
    name: 'Storage',
    slug: 'storage',
    description: 'Architectural solid oak credenzas and slatted tambour sideboards',
    image: '/images/collections/living-room.jpg',
  },
];

const productsToSeed = [
  {
    customId: 'prod-1',
    sku: 'NST-CHR-LIN-001',
    name: 'Linen Lounge Chair',
    slug: 'linen-lounge-chair',
    subtitle: 'Tactile relaxation in natural Belgian flax',
    brand: 'Nestora Atelier',
    price: 24999,
    originalPrice: 28999,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room', 'Bedroom'],
    styles: ['Minimal', 'Modern'],
    badge: 'Bestseller',
    image: '/images/products/linen-lounge-chair.jpg',
    hoverImage: '/images/products/linen-lounge-chair-hover.jpg',
    images: [
      '/images/products/linen-lounge-chair.jpg',
      '/images/products/linen-lounge-chair-hover.jpg',
    ],
    description: 'Expertly crafted with a solid ash wood frame and upholstered in premium organic Belgian linen.',
    stock: 15,
    lowStockThreshold: 5,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-2',
    sku: 'NST-TBL-OAK-002',
    name: 'Oak Coffee Table',
    slug: 'oak-coffee-table',
    subtitle: 'Low-profile architectural silhouette',
    brand: 'NordicCraft',
    price: 14999,
    originalPrice: 17999,
    category: 'Tables',
    subcategory: 'Coffee Tables',
    rooms: ['Living Room'],
    styles: ['Minimal', 'Scandinavian'],
    badge: "Editor's Pick",
    image: '/images/products/oak-coffee-table.jpg',
    hoverImage: '/images/products/oak-coffee-table-hover.jpg',
    images: [
      '/images/products/oak-coffee-table.jpg',
      '/images/products/oak-coffee-table-hover.jpg',
    ],
    description: 'Carved from sustainably harvested European white oak with soft rounded edges.',
    stock: 12,
    lowStockThreshold: 4,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-3',
    sku: 'NST-CHR-BOU-003',
    name: 'Bouclé Accent Chair',
    slug: 'boucle-accent-chair',
    subtitle: 'Sculptural curve with plush warmth',
    brand: 'Forma Studio',
    price: 18999,
    originalPrice: null,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room', 'Bedroom'],
    styles: ['Japandi', 'Modern'],
    badge: 'New Season',
    image: '/images/products/boucle-accent-chair.jpg',
    hoverImage: '/images/products/boucle-accent-chair-hover.jpg',
    images: [
      '/images/products/boucle-accent-chair.jpg',
      '/images/products/boucle-accent-chair-hover.jpg',
    ],
    description: 'An organic silhouette wrapped in tactile cream bouclé fabric.',
    stock: 3, // Low stock for demonstration
    lowStockThreshold: 5,
    isFeatured: false,
    isNewArrival: true,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-4',
    sku: 'NST-LMP-FLR-004',
    name: 'Minimal Floor Lamp',
    slug: 'minimal-floor-lamp',
    subtitle: 'Warm ambient glow with slender steel stem',
    brand: 'Studio Koto',
    price: 8999,
    originalPrice: 10499,
    category: 'Lighting',
    subcategory: 'Floor Lamps',
    rooms: ['Workspace', 'Living Room'],
    styles: ['Minimal'],
    badge: null,
    image: '/images/products/minimal-floor-lamp.jpg',
    hoverImage: '/images/products/minimal-floor-lamp-hover.jpg',
    images: [
      '/images/products/minimal-floor-lamp.jpg',
      '/images/products/minimal-floor-lamp-hover.jpg',
    ],
    description: 'A slender matte brass floor lamp featuring an adjustable linen shade.',
    stock: 20,
    lowStockThreshold: 5,
    isFeatured: true,
    isNewArrival: true,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-5',
    sku: 'NST-RUG-JUT-005',
    name: 'Natural Jute Rug',
    slug: 'natural-jute-rug',
    subtitle: 'Hand-woven texturing in raw earth fiber',
    brand: 'Loom & Weave',
    price: 12499,
    originalPrice: null,
    category: 'Rugs',
    subcategory: 'Area Rugs',
    rooms: ['Dining Room', 'Balcony'],
    styles: ['Boho', 'Japandi'],
    badge: 'Handcrafted',
    image: '/images/products/natural-jute-rug.jpg',
    hoverImage: '/images/products/natural-jute-rug-hover.jpg',
    images: [
      '/images/products/natural-jute-rug.jpg',
      '/images/products/natural-jute-rug-hover.jpg',
    ],
    description: 'Hand-loomed by master artisans using 100% natural un-dyed jute fibers.',
    stock: 14,
    lowStockThreshold: 4,
    isFeatured: false,
    isNewArrival: false,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-6',
    sku: 'NST-TBL-WAL-006',
    name: 'Walnut Side Table',
    slug: 'walnut-side-table',
    subtitle: 'Compact elegance with rich dark grain',
    brand: 'Earth & Timber',
    price: 9999,
    originalPrice: 11999,
    category: 'Tables',
    subcategory: 'Side Tables',
    rooms: ['Bedroom', 'Living Room'],
    styles: ['Scandinavian', 'Modern'],
    badge: null,
    image: '/images/products/walnut-side-table.jpg',
    hoverImage: '/images/products/walnut-side-table-hover.jpg',
    images: [
      '/images/products/walnut-side-table.jpg',
      '/images/products/walnut-side-table-hover.jpg',
    ],
    description: 'Precision-turned American walnut nightstand or sofa companion table.',
    stock: 10,
    lowStockThreshold: 3,
    isFeatured: false,
    isNewArrival: true,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-7',
    sku: 'NST-SOF-MOD-007',
    name: 'Modern Lounge Sofa',
    slug: 'modern-lounge-sofa',
    subtitle: 'Deep seating sanctuary in muted stone fabric',
    brand: 'Nestora Atelier',
    price: 54999,
    originalPrice: 62999,
    category: 'Furniture',
    subcategory: 'Seating',
    rooms: ['Living Room'],
    styles: ['Modern', 'Contemporary'],
    badge: 'Flagship Piece',
    image: '/images/products/modern-lounge-sofa.jpg',
    hoverImage: '/images/products/modern-lounge-sofa-hover.jpg',
    images: [
      '/images/products/modern-lounge-sofa.jpg',
      '/images/products/modern-lounge-sofa-hover.jpg',
    ],
    description: 'Generous 3-seater modular sofa with plush down-blend filled cushions.',
    stock: 5,
    lowStockThreshold: 2,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-8',
    sku: 'NST-LMP-CER-008',
    name: 'Ceramic Table Lamp',
    slug: 'ceramic-table-lamp',
    subtitle: 'Artisanal stoneware base with raw texture',
    brand: 'Studio Koto',
    price: 6499,
    originalPrice: null,
    category: 'Lighting',
    subcategory: 'Table Lamps',
    rooms: ['Bedroom', 'Workspace'],
    styles: ['Japandi', 'Minimal'],
    badge: 'Handcrafted',
    image: '/images/products/ceramic-table-lamp.jpg',
    hoverImage: '/images/products/ceramic-table-lamp-hover.jpg',
    images: [
      '/images/products/ceramic-table-lamp.jpg',
      '/images/products/ceramic-table-lamp-hover.jpg',
    ],
    description: 'Wheel-thrown ceramic lamp with a tactile matte speckled glaze.',
    stock: 16,
    lowStockThreshold: 5,
    isFeatured: false,
    isNewArrival: true,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-9',
    sku: 'NST-STR-CRE-009',
    name: 'Solid Oak Credenza',
    slug: 'solid-oak-credenza',
    subtitle: 'Architectural sideboard with sliding slatted doors',
    brand: 'NordicCraft',
    price: 39999,
    originalPrice: 46999,
    category: 'Storage',
    subcategory: 'Credenzas',
    rooms: ['Dining Room', 'Living Room'],
    styles: ['Scandinavian', 'Modern'],
    badge: 'New Arrival',
    image: '/images/products/solid-oak-credenza.jpg',
    hoverImage: '/images/products/solid-oak-credenza-hover.jpg',
    images: [
      '/images/products/solid-oak-credenza.jpg',
      '/images/products/solid-oak-credenza-hover.jpg',
    ],
    description: 'Spacious 4-door storage credenza with tambour slatted oak doors.',
    stock: 2, // Low stock alert
    lowStockThreshold: 3,
    isFeatured: true,
    isNewArrival: true,
    status: 'active',
    isActive: true,
  },
  {
    customId: 'prod-10',
    sku: 'NST-TBL-TRA-010',
    name: 'Travertine Dining Table',
    slug: 'travertine-dining-table',
    subtitle: 'Monolithic honed Italian stone surface',
    brand: 'Forma Studio',
    price: 124999,
    originalPrice: 139999,
    category: 'Tables',
    subcategory: 'Dining Tables',
    rooms: ['Dining Room'],
    styles: ['Luxury', 'Modern'],
    badge: 'Limited Edition',
    image: '/images/products/travertine-dining-table.jpg',
    hoverImage: '/images/products/travertine-dining-table-hover.jpg',
    images: [
      '/images/products/travertine-dining-table.jpg',
      '/images/products/travertine-dining-table-hover.jpg',
    ],
    description: 'Statement 8-seater dining table with an oval honed travertine top.',
    stock: 0, // Out of stock
    lowStockThreshold: 2,
    isFeatured: true,
    isNewArrival: false,
    status: 'active',
    isActive: true,
  },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nestora';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB.');

    // Seed Categories
    for (const c of initialCategories) {
      await Category.findOneAndUpdate(
        { slug: c.slug },
        c,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[Seed] Successfully seeded ${initialCategories.length} categories.`);

    // Seed Products
    let inserted = 0;
    let updated = 0;
    for (const p of productsToSeed) {
      const existing = await Product.findOne({ slug: p.slug }, { _id: 1 });
      await Product.findOneAndUpdate(
        { slug: p.slug },
        p,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (existing) {
        updated += 1;
        console.log(`  ↻ Updated: ${p.name} (${p.sku})`);
      } else {
        inserted += 1;
        console.log(`  + Inserted: ${p.name} (${p.sku})`);
      }
    }

    console.log('');
    console.log(`Products seeded successfully`);
    console.log(`Seeded: ${inserted + updated} products (${inserted} new, ${updated} updated)`);
    console.log(`[Seed] Successfully seeded ${productsToSeed.length} products with SKUs and stock metrics.`);
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
}

seed();
