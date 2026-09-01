const mongoose = require('mongoose');

const spaceProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  variant: {
    type: String,
    default: '',
  },
});

const spaceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Space name is required'],
      trim: true,
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: ['Living Room', 'Bedroom', 'Workspace', 'Dining Room', 'Balcony', 'Outdoor', 'Other'],
      default: 'Living Room',
    },
    style: {
      type: String,
      required: [true, 'Style is required'],
      enum: ['Minimal', 'Modern', 'Scandinavian', 'Japandi', 'Boho', 'Industrial', 'Luxury', 'Contemporary'],
      default: 'Modern',
    },
    budget: {
      type: Number,
      default: 50000,
    },
    estimatedTotal: {
      type: Number,
      default: 0,
    },
    products: [spaceProductSchema],
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user & updatedAt
spaceSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Space', spaceSchema);
