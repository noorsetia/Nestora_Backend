const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public Article Routes
router.get('/', articleController.getArticles);
router.get('/:slug', articleController.getArticleBySlug);
router.get('/category/:category', articleController.getArticlesByCategory);

// Admin Article Management Routes
router.post('/', protect, authorize('admin', 'superadmin'), articleController.createArticle);
router.put('/:id', protect, authorize('admin', 'superadmin'), articleController.updateArticle);
router.delete('/:id', protect, authorize('admin', 'superadmin'), articleController.deleteArticle);

module.exports = router;
