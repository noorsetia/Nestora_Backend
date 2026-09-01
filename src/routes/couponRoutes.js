const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Public endpoint to validate coupon (uses optionalAuth if user token is provided)
router.post('/validate', optionalAuth, couponController.validateCoupon);

module.exports = router;
