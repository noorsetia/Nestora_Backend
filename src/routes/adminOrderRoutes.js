const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All admin order routes require authentication and admin/superadmin role
router.use(protect, requireRole('admin', 'superadmin'));

router.get('/', adminOrderController.getOrders);
router.get('/:id', adminOrderController.getOrderById);
router.patch('/:id/status', adminOrderController.updateStatus);
router.patch('/:id/cancel', adminOrderController.cancelOrder);
router.post('/:id/refund', adminOrderController.refundOrder);

module.exports = router;
