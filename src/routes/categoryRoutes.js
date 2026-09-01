const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategoryBySlug);
router.get('/:slug/products', productController.getCategoryProducts);

// Admin-only routes
router.post('/', protect, requireRole('admin', 'superadmin'), categoryController.createCategory);
router.put('/:id', protect, requireRole('admin', 'superadmin'), categoryController.updateCategory);
router.delete('/:id', protect, requireRole('admin', 'superadmin'), categoryController.deleteCategory);

module.exports = router;
