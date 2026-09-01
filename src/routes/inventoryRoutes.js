const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All inventory endpoints require authentication + admin/superadmin role
router.use(protect, requireRole('admin', 'superadmin'));

router.get('/', inventoryController.getInventory);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/logs', inventoryController.getLogs);
router.patch('/:productId', inventoryController.updateStock);

module.exports = router;
