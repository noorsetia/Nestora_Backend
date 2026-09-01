const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/profile', userController.getProfile);
router.get('/current-user', userController.getProfile);
router.get('/current-user/profile', userController.getProfile);
router.get('/me', userController.getProfile);
router.put('/profile', userController.updateProfile);

router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

router.put('/change-password', userController.changePassword);
router.delete('/account', userController.deleteAccount);

router.get('/wishlist', userController.getWishlist);
router.post('/wishlist/toggle/:productId', userController.toggleWishlist);
router.post('/wishlist/:productId', userController.addToWishlist);
router.delete('/wishlist/:productId', userController.removeFromWishlist);

module.exports = router;
