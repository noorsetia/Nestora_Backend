const notificationService = require('../services/notificationService');
const emailService = require('../services/email/emailService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const notificationController = {
  // GET /api/notifications
  getUserNotifications: async (req, res, next) => {
    try {
      const { page, limit, unreadOnly } = req.query;
      const result = await notificationService.getUserNotifications(req.user._id, {
        page,
        limit,
        unreadOnly: unreadOnly === 'true',
      });

      return res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/notifications/unread-count
  getUnreadCount: async (req, res, next) => {
    try {
      const count = await notificationService.getUnreadCount(req.user._id);
      return res.status(200).json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/notifications/:id/read
  markAsRead: async (req, res, next) => {
    try {
      const notification = await notificationService.markAsRead(req.user._id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/notifications/read-all
  markAllAsRead: async (req, res, next) => {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/notifications/:id
  deleteNotification: async (req, res, next) => {
    try {
      await notificationService.deleteNotification(req.user._id, req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/users/notification-preferences
  getPreferences: async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      return res.status(200).json({
        success: true,
        data: user ? user.notificationPreferences : {},
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/users/notification-preferences
  updatePreferences: async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...req.body,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        data: user.notificationPreferences,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/notifications/broadcast
  broadcastPromotion: async (req, res, next) => {
    try {
      const { title, message, ctaLink, sendEmail } = req.body;

      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Title and message are required.' });
      }

      const notifications = await notificationService.createBulkNotifications({
        type: 'PROMOTION',
        title,
        message,
        data: { link: ctaLink || '/products' },
      });

      if (sendEmail) {
        const users = await User.find({ role: 'user', status: 'active' });
        for (const user of users) {
          emailService.sendPromotionalEmail({
            userId: user._id,
            userEmail: user.email,
            title,
            message,
            ctaLink,
          });
        }
      }

      await AuditLog.create({
        user: req.user._id,
        action: 'BROADCAST_PROMOTION',
        entity: 'Notification',
        metadata: { title, count: notifications.length, sendEmail: !!sendEmail },
      });

      return res.status(201).json({
        success: true,
        message: `Promotional notification sent to ${notifications.length} users.`,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/notifications
  getAdminNotifications: async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const result = await notificationService.getAdminNotifications({ page, limit });
      return res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = notificationController;
