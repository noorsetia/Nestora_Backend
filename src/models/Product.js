const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  value: { type: String, default: '' },
  colorHex: { type: String, default: '' },
  priceModifier: { type: Number, default: 0 },
  stock: { type: Number, default: 10 },
});

const dimensionsSchema = new mongoose.Schema({
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  depth: { type: String, default: '' },
  unit: { type: String, default: 'cm' },
});

const productSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    brand: {
      type: String,
      default: 'Nestora Atelier',
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    rooms: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    room: {
      type: String,
      default: 'Living Room',
    },
    styles: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    style: {
      type: String,
      default: 'Modern',
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      index: true,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      default: 10,
    },
    stockCount: {
      type: Number,
      default: 10,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      required: [true, 'Primary image URL is required'],
    },
    hoverImage: {
      type: String,
      default: '',
    },
    images: [{ type: String }],
    description: {
      type: String,
      default: '',
    },
    craftsmanship: {
      type: String,
      default: '',
    },
    variants: [variantSchema],
    materials: [{ type: String }],
    dimensions: {
      type: dimensionsSchema,
      default: () => ({}),
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 12,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
      index: true,
    },
    badge: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Sync stock with stockCount and inStock before saving
productSchema.pre('save', function (next) {
  if (this.stock !== undefined) {
    this.stockCount = this.stock;
    this.inStock = this.stock > 0;
  }
  if (this.status === 'inactive' || this.status === 'draft') {
    this.isActive = false;
  } else if (this.status === 'active') {
    this.isActive = true;
  }
  if (this.originalPrice && this.originalPrice > this.price) {
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
