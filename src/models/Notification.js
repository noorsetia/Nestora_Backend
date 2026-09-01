const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'ORDER_CONFIRMED',
  'ORDER_PROCESSING',
  'ORDER_SHIPPED',
  'ORDER_OUT_FOR_DELIVERY',
  'ORDER_DELIVERED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'ORDER_CANCELLED',
  'REFUND_PROCESSED',
  'REVIEW_APPROVED',
  'REVIEW_REJECTED',
  'COUPON_AVAILABLE',
  'PROMOTION',
  'SYSTEM',
  'ADMIN_ALERT',
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      orderId: { type: String, default: '' },
      orderNumber: { type: String, default: '' },
      productSlug: { type: String, default: '' },
      link: { type: String, default: '' },
      amount: { type: Number, default: 0 },
      extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isAdminAlert: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user timeline queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
