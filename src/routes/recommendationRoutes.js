const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/space', recommendationController.getSpaceRecommendations);
router.get('/complete-look/:productId', recommendationController.getCompleteLook);
router.get('/similar/:productId', recommendationController.getSimilarProducts);
router.get('/for-you', optionalAuth, recommendationController.getPersonalized);

module.exports = router;
