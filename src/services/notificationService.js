const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * Create a single in-app notification
   */
  async createNotification({ userId, type, title, message, data = {}, isAdminAlert = false }) {
    if (Notification.db.readyState !== 1) return null;
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) return null;

    // Verify user in-app notification preferences
    if (!isAdminAlert && userId) {
      try {
        const user = await User.findById(userId);
        if (user && user.notificationPreferences && user.notificationPreferences.inApp) {
          const prefs = user.notificationPreferences.inApp;
          if (type.startsWith('ORDER_') && prefs.orderUpdates === false) return null;
          if (type === 'PROMOTION' && prefs.promotions === false) return null;
        }
      } catch (err) {}
    }

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      isAdminAlert,
    });

    return notification;
  }

  /**
   * Broadcast/Bulk notifications (e.g. promotional launches)
   */
  async createBulkNotifications({ userIds, type, title, message, data = {} }) {
    if (Notification.db.readyState !== 1) return [];

    let targetIds = userIds;
    if (!targetIds || targetIds.length === 0) {
      const users = await User.find({ role: 'user', status: 'active' }).select('_id');
      targetIds = users.map((u) => u._id);
    }

    targetIds = targetIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const docs = targetIds.map((id) => ({
      user: id,
      type,
      title,
      message,
      data,
    }));

    return await Notification.insertMany(docs);
  }

  /**
   * Fetch paginated user notifications
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

    if (Notification.db.readyState !== 1 || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return {
        notifications: [],
        pagination: { page: numericPage, limit: numericLimit, total: 0, pages: 1 },
      };
    }

    const query = { user: userId, isAdminAlert: false };
    if (unreadOnly) {
      query.read = false;
    }

    const skip = (numericPage - 1) * numericLimit;

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit) || 1,
      },
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId, notificationId) {
    if (Notification.db.readyState !== 1) return null;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllAsRead(userId) {
    if (Notification.db.readyState !== 1 || !userId || !mongoose.Types.ObjectId.isValid(userId)) return { modifiedCount: 0 };

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return { modifiedCount: result.modifiedCount || 0 };
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId, notificationId) {
    if (Notification.db.readyState !== 1) return true;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    await notification.deleteOne();
    return true;
  }

  /**
   * Unread notification count for Navbar badge
   */
  async getUnreadCount(userId) {
    if (Notification.db.readyState !== 1 || !userId || !mongoose.Types.ObjectId.isValid(userId)) return 0;
    return await Notification.countDocuments({ user: userId, read: false, isAdminAlert: false });
  }

  /**
   * Admin Notifications
   */
  async getAdminNotifications({ page = 1, limit = 20 }) {
    if (Notification.db.readyState !== 1) return { notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    const [notifications, total] = await Promise.all([
      Notification.find({ isAdminAlert: true }).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
      Notification.countDocuments({ isAdminAlert: true }),
    ]);

    return {
      notifications,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit) || 1,
      },
    };
  }

  /**
   * Create Low Stock Alert for Admins
   */
  async createLowStockAlert(product) {
    if (Notification.db.readyState !== 1) return;

    // Check if an unread alert for this product already exists to avoid duplicate spam
    const existing = await Notification.findOne({
      isAdminAlert: true,
      'data.productSlug': product.slug,
      read: false,
    });

    if (existing) return;

    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id');
    for (const admin of admins) {
      await this.createNotification({
        userId: admin._id,
        type: 'ADMIN_ALERT',
        title: 'Low Stock Threshold Warning',
        message: `Low stock detected: "${product.name}" has only ${product.stock} units remaining.`,
        data: { productSlug: product.slug, link: '/admin/inventory' },
        isAdminAlert: true,
      });
    }
  }
}

module.exports = new NotificationService();
