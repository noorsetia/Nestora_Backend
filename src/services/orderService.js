const mongoose = require('mongoose');
const Order = require('../models/Order');

const orderService = {
  // Get all orders for logged-in user
  getUserOrders: async (userId) => {
    if (Order.db.readyState !== 1) return [];
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name image slug');
    return orders;
  },

  // Get single order by id or orderNumber for logged-in user
  getOrderById: async (userId, orderIdOrNumber) => {
    if (Order.db.readyState !== 1) {
      const error = new Error('Order not found or unauthorized access');
      error.statusCode = 404;
      throw error;
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error('Order not found or unauthorized access');
      error.statusCode = 404;
      throw error;
    }

    let order = null;

    if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
      order = await Order.findOne({ _id: orderIdOrNumber, user: userId }).populate(
        'items.product',
        'name image slug category'
      );
    }

    if (!order) {
      order = await Order.findOne({ orderNumber: orderIdOrNumber, user: userId }).populate(
        'items.product',
        'name image slug category'
      );
    }

    if (!order) {
      const error = new Error('Order not found or unauthorized access');
      error.statusCode = 404;
      throw error;
    }

    return order;
  },
};

module.exports = orderService;
