const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public catalog routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/:slug', productController.getProductBySlug);

// Admin-only mutation routes
router.post('/', protect, requireRole('admin', 'superadmin'), productController.createProduct);
router.put('/:id', protect, requireRole('admin', 'superadmin'), productController.updateProduct);
router.patch('/:id/status', protect, requireRole('admin', 'superadmin'), productController.updateStatus);
router.delete('/:id', protect, requireRole('admin', 'superadmin'), productController.deleteProduct);

module.exports = router;
