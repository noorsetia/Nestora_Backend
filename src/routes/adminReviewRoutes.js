const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(protect, requireRole('admin', 'superadmin'));

router.get('/', reviewController.getAdminReviews);
router.patch('/:id/status', reviewController.updateStatus);
router.post('/:id/respond', reviewController.respondToReview);

module.exports = router;
