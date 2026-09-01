const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    change: {
      type: Number,
      required: true,
    },
    operation: {
      type: String,
      enum: ['increase', 'decrease', 'set', 'order_fulfillment'],
      required: true,
    },
    reason: {
      type: String,
      default: 'Manual adjustment',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
