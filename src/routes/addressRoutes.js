const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { protect } = require('../middleware/authMiddleware');

// All address routes require authentication
router.use(protect);

router
  .route('/')
  .get(addressController.getAddresses)
  .post(addressController.addAddress);

router
  .route('/:addressId')
  .put(addressController.updateAddress)
  .delete(addressController.deleteAddress);

router
  .route('/:addressId/default')
  .patch(addressController.setDefaultAddress);

module.exports = router;
