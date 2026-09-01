const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer Notification Routes (Requires auth)
router.get('/', protect, notificationController.getUserNotifications);
router.get('/unread-count', protect, notificationController.getUnreadCount);
router.patch('/read-all', protect, notificationController.markAllAsRead);
router.patch('/:id/read', protect, notificationController.markAsRead);
router.delete('/:id', protect, notificationController.deleteNotification);

// User Notification Preferences Routes
router.get('/preferences', protect, notificationController.getPreferences);
router.put('/preferences', protect, notificationController.updatePreferences);

// Admin Notification & Broadcast Routes
router.get('/admin', protect, authorize('admin', 'superadmin'), notificationController.getAdminNotifications);
router.post('/admin/broadcast', protect, authorize('admin', 'superadmin'), notificationController.broadcastPromotion);

module.exports = router;
