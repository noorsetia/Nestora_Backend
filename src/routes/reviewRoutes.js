const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Public reviews endpoint
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// Protected customer review actions
router.get('/products/:productId/review-eligibility', protect, reviewController.checkEligibility);
router.post('/products/:productId/reviews', protect, reviewController.createReview);

module.exports = router;
