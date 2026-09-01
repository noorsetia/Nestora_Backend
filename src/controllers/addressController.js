const addressService = require('../services/addressService');

const addressController = {
  // GET /api/users/addresses
  getAddresses: async (req, res, next) => {
    try {
      const addresses = await addressService.getAddresses(req.user._id);
      res.status(200).json({
        success: true,
        data: { addresses },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/users/addresses
  addAddress: async (req, res, next) => {
    try {
      const { fullName, phone, addressLine1, city, state, postalCode } = req.body;

      if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required address fields (fullName, phone, addressLine1, city, state, postalCode)',
          code: 'INVALID_ADDRESS',
        });
      }

      const addresses = await addressService.addAddress(req.user._id, req.body);
      res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: { addresses },
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/users/addresses/:addressId
  updateAddress: async (req, res, next) => {
    try {
      const addresses = await addressService.updateAddress(
        req.user._id,
        req.params.addressId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: { addresses },
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/users/addresses/:addressId
  deleteAddress: async (req, res, next) => {
    try {
      const addresses = await addressService.deleteAddress(
        req.user._id,
        req.params.addressId
      );
      res.status(200).json({
        success: true,
        message: 'Address removed successfully',
        data: { addresses },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/users/addresses/:addressId/default
  setDefaultAddress: async (req, res, next) => {
    try {
      const addresses = await addressService.setDefaultAddress(
        req.user._id,
        req.params.addressId
      );
      res.status(200).json({
        success: true,
        message: 'Default address updated',
        data: { addresses },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = addressController;
