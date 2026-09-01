const couponService = require('../services/couponService');

const couponController = {
  // Public validation
  validateCoupon: async (req, res, next) => {
    try {
      const { code, cartItems, subtotal } = req.body;
      const userId = req.user ? req.user._id : null;
      const validation = await couponService.validateCoupon({
        code,
        userId,
        cartItems,
        subtotal,
      });

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin CRUD
  getCoupons: async (req, res, next) => {
    try {
      const data = await couponService.listCouponsAdmin(req.query);
      res.json({
        success: true,
        data: data.coupons || data,
        pagination: data.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  createCoupon: async (req, res, next) => {
    try {
      const coupon = await couponService.createCoupon(req.body, req.user);
      res.status(201).json({
        success: true,
        message: `Coupon code '${coupon.code}' created successfully.`,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  },

  updateCoupon: async (req, res, next) => {
    try {
      const coupon = await couponService.updateCoupon(req.params.id, req.body, req.user);
      res.json({
        success: true,
        message: `Coupon '${coupon.code}' updated.`,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req, res, next) => {
    try {
      const { isActive } = req.body;
      const coupon = await couponService.updateCouponStatus(req.params.id, isActive, req.user);
      res.json({
        success: true,
        message: `Coupon '${coupon.code}' status set to ${coupon.isActive ? 'active' : 'inactive'}.`,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteCoupon: async (req, res, next) => {
    try {
      await couponService.deleteCoupon(req.params.id, req.user);
      res.json({
        success: true,
        message: 'Coupon deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = couponController;
