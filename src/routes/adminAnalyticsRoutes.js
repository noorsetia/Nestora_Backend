const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(protect, requireRole('admin', 'superadmin'));

router.get('/overview', analyticsController.getOverview);
router.get('/sales', analyticsController.getSales);
router.get('/top-products', analyticsController.getTopProducts);
router.get('/categories', analyticsController.getCategories);

module.exports = router;
