const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  position: {
    top: { type: Number, required: true }, // Percentage from top
    left: { type: Number, required: true }, // Percentage from left
  },
  hotspotLabel: {
    type: String,
    default: 'Featured Piece',
  },
});

const roomSetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room set name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      default: 'Living Room',
    },
    style: {
      type: String,
      default: 'Modern',
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      required: [true, 'Room set image is required'],
    },
    hotspots: [hotspotSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RoomSet', roomSetSchema);
