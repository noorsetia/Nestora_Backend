const Order = require('../models/Order');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const AuditLog = require('../models/AuditLog');
const notificationService = require('./notificationService');
const emailService = require('./email/emailService');

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Memory fallback store when MongoDB is inactive
const memoryOrders = [];

const validateOrderStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`Invalid order status transition from '${currentStatus}' to '${newStatus}'.`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
  return true;
};

const restoreOrderStock = async (order, updatedByUserId, reasonText) => {
  if (!order.items || !Array.isArray(order.items)) return;
  for (const item of order.items) {
    if (!item.product) continue;
    try {
      if (Product.db.readyState === 1) {
        const product = await Product.findById(item.product);
        if (product) {
          const previousStock = product.stock;
          product.stock += item.quantity;
          product.stockCount += item.quantity;
          product.inStock = product.stock > 0;
          await product.save();

          await InventoryLog.create({
            product: product._id,
            previousStock,
            newStock: product.stock,
            change: item.quantity,
            operation: 'order_cancellation',
            reason: reasonText || `Stock restored from cancelled Order #${order.orderNumber}`,
            updatedBy: updatedByUserId || null,
          });
        }
      } else {
        const productService = require('./productService');
        const prod = (productService.memoryProducts || []).find((p) => p._id === item.product || p.id === item.product);
        if (prod) {
          prod.stock = (prod.stock || 0) + item.quantity;
          prod.stockCount = prod.stock;
          prod.inStock = prod.stock > 0;
        }
      }
    } catch (err) {
      console.error(`[Stock Restoration Error] Product ${item.product}:`, err.message);
    }
  }
};

const adminOrderService = {
  memoryOrders,
  validateOrderStatusTransition,
  restoreOrderStock,

  listOrders: async ({
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    deliveryMethod,
    dateFrom,
    dateTo,
    search,
    userId,
  }) => {
    if (Order.db.readyState === 1) {
      const query = {};

      if (status && status !== 'all') {
        query.orderStatus = status;
      }
      if (paymentStatus && paymentStatus !== 'all') {
        query['payment.status'] = paymentStatus;
      }
      if (deliveryMethod && deliveryMethod !== 'all') {
        query.deliveryMethod = deliveryMethod;
      }
      if (userId) {
        query.user = userId;
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { orderNumber: searchRegex },
          { 'shippingAddress.fullName': searchRegex },
          { 'shippingAddress.phone': searchRegex },
        ];
      }

      const numericPage = Math.max(1, parseInt(page, 10));
      const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (numericPage - 1) * numericLimit;

      const [orders, totalOrders] = await Promise.all([
        Order.find(query)
          .populate('user', 'firstName lastName email phone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(numericLimit),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalOrders,
          totalPages: Math.ceil(totalOrders / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback
    let list = [...memoryOrders];

    if (status && status !== 'all') {
      list = list.filter((o) => o.orderStatus === status);
    }
    if (paymentStatus && paymentStatus !== 'all') {
      list = list.filter((o) => o.payment && o.payment.status === paymentStatus);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
          (o.shippingAddress && o.shippingAddress.fullName && o.shippingAddress.fullName.toLowerCase().includes(q))
      );
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const totalOrders = list.length;
    const paginated = list.slice((numericPage - 1) * numericLimit, numericPage * numericLimit);

    return {
      orders: paginated,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / numericLimit) || 1,
      },
    };
  },

  getOrderById: async (orderId) => {
    if (Order.db.readyState === 1) {
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName email phone roles addresses')
        .populate('items.product', 'name sku image category price');

      if (!order) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        error.code = 'ORDER_NOT_FOUND';
        throw error;
      }

      return order;
    }

    const order = memoryOrders.find((o) => o._id.toString() === orderId || o.id === orderId);
    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }
    return order;
  },

  updateOrderStatus: async (orderId, newStatus, adminUser) => {
    let order = null;
    const isDb = Order.db.readyState === 1;

    if (isDb) {
      order = await Order.findById(orderId).populate('user', 'email firstName lastName');
    } else {
      order = memoryOrders.find((o) => o._id.toString() === orderId || o.id === orderId);
    }

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    if (order.orderStatus === newStatus) {
      return order;
    }

    validateOrderStatusTransition(order.orderStatus, newStatus);

    const oldStatus = order.orderStatus;
    order.orderStatus = newStatus;

    if (!order.statusHistory) order.statusHistory = [];
    const now = new Date();
    order.statusHistory.push({
      status: newStatus,
      timestamp: now,
      note: `Status updated to ${newStatus} by admin`,
      updatedBy: adminUser ? (adminUser._id ? adminUser._id.toString() : adminUser.id || 'admin') : 'admin',
    });

    if (newStatus === 'confirmed' && !order.confirmedAt) order.confirmedAt = now;
    if (newStatus === 'processing' && !order.processingAt) order.processingAt = now;
    if (newStatus === 'packed' && !order.packedAt) order.packedAt = now;
    if (newStatus === 'shipped' && !order.shippedAt) order.shippedAt = now;
    if (newStatus === 'out_for_delivery' && !order.outForDeliveryAt) order.outForDeliveryAt = now;
    if (newStatus === 'delivered' && !order.deliveredAt) order.deliveredAt = now;

    if (newStatus === 'cancelled') {
      order.cancelledAt = now;
      order.cancelledBy = 'admin';
      await restoreOrderStock(order, adminUser ? adminUser._id : null, `Order status set to cancelled by admin`);
    }

    if (isDb) {
      await order.save();

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: order._id.toString(),
        metadata: {
          orderNumber: order.orderNumber,
          previousStatus: oldStatus,
          newStatus,
        },
      });
    }

    // In-App Notification & Email Dispatch
    try {
      const userEmail = order.user ? order.user.email : (order.shippingAddress && order.shippingAddress.email);
      const typeMap = {
        processing: 'ORDER_PROCESSING',
        shipped: 'ORDER_SHIPPED',
        out_for_delivery: 'ORDER_OUT_FOR_DELIVERY',
        delivered: 'ORDER_DELIVERED',
      };

      if (typeMap[newStatus] && order.user) {
        await notificationService.createNotification({
          userId: order.user._id || order.user,
          type: typeMap[newStatus],
          title: `Order Status: ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
          message: `Your Nestora order #${order.orderNumber} status is now ${newStatus.replace(/_/g, ' ')}.`,
          data: { orderNumber: order.orderNumber, link: '/account/orders' },
        });
      }

      if (newStatus === 'shipped' && userEmail) {
        emailService.sendShippingUpdateEmail({ userEmail, orderNumber: order.orderNumber });
      } else if (newStatus === 'delivered' && userEmail) {
        emailService.sendDeliveryConfirmationEmail({ userEmail, orderNumber: order.orderNumber });
      }
    } catch (nErr) {
      console.warn('[Notification Error]', nErr.message);
    }

    return order;
  },

  cancelOrderAdmin: async (orderId, reason, adminUser) => {
    let order = null;
    const isDb = Order.db.readyState === 1;

    if (isDb) {
      order = await Order.findById(orderId).populate('user', 'email');
    } else {
      order = memoryOrders.find((o) => o._id.toString() === orderId || o.id === orderId);
    }

    if (!order) {
      const error = new Error('Order not found.');
      error.statusCode = 404;
      throw error;
    }

    // If order is already cancelled, return without double-restoring inventory
    if (order.orderStatus === 'cancelled') {
      return order;
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Admin cancelled order';
    order.cancelledBy = 'admin';

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by admin: ${reason || 'No reason provided'}`,
      updatedBy: adminUser ? (adminUser._id ? adminUser._id.toString() : adminUser.id || 'admin') : 'admin',
    });

    if (isDb) {
      await order.save();
      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'CANCEL_ORDER_ADMIN',
        entity: 'Order',
        entityId: order._id.toString(),
        metadata: {
          orderNumber: order.orderNumber,
          previousStatus,
          reason,
        },
      });
    }

    // Restore Inventory Exactly Once
    await restoreOrderStock(order, adminUser ? adminUser._id : null, `Admin cancellation: ${order.cancellationReason}`);

    // In-App Notification & Email
    try {
      if (order.user) {
        await notificationService.createNotification({
          userId: order.user._id || order.user,
          type: 'ORDER_CANCELLED',
          title: 'Order Cancelled',
          message: `Order #${order.orderNumber} has been cancelled.`,
          data: { orderNumber: order.orderNumber },
        });
        const email = order.user.email || (order.shippingAddress && order.shippingAddress.email);
        if (email) {
          emailService.sendCancellationEmail({
            userEmail: email,
            orderNumber: order.orderNumber,
            reason,
          });
        }
      }
    } catch (nErr) {
      console.warn('[Notification Warning]', nErr.message);
    }

    return order;
  },

  cancelOrderCustomer: async (orderId, userId, reason) => {
    let order = null;
    const isDb = Order.db.readyState === 1;

    if (isDb) {
      order = await Order.findOne({ _id: orderId, user: userId });
    } else {
      order = memoryOrders.find(
        (o) => (o._id.toString() === orderId || o.id === orderId) && (o.user === userId || o.user?._id === userId)
      );
    }

    if (!order) {
      const error = new Error('Order not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Duplicate cancellation protection
    if (order.orderStatus === 'cancelled') {
      return order;
    }

    const allowedCancellationStatuses = ['pending', 'confirmed', 'processing'];
    if (!allowedCancellationStatuses.includes(order.orderStatus)) {
      const error = new Error(`Order cannot be cancelled at status '${order.orderStatus}'. Please contact support.`);
      error.statusCode = 400;
      error.code = 'CANCELLATION_NOT_ALLOWED';
      throw error;
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Customer requested cancellation';
    order.cancelledBy = 'customer';

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by customer: ${reason || 'User initiated'}`,
      updatedBy: userId.toString(),
    });

    if (isDb) {
      await order.save();
    }

    await restoreOrderStock(order, userId, `Customer cancelled Order #${order.orderNumber}`);

    // In-App Notification & Email
    try {
      const User = require('../models/User');
      const user = isDb ? await User.findById(userId) : null;

      await notificationService.createNotification({
        userId,
        type: 'ORDER_CANCELLED',
        title: 'Order Cancelled',
        message: `Your cancellation request for order #${order.orderNumber} has been processed.`,
        data: { orderNumber: order.orderNumber },
      });

      if (user && user.email) {
        emailService.sendCancellationEmail({
          userEmail: user.email,
          orderNumber: order.orderNumber,
          reason,
        });
      }
    } catch (nErr) {
      console.warn('[Notification Warning]', nErr.message);
    }

    return order;
  },
};

module.exports = adminOrderService;
