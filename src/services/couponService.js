const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

const memoryCoupons = [];

const validateCouponInput = (data, isUpdate = false) => {
  if (!isUpdate || data.code !== undefined) {
    if (!data.code || !data.code.trim()) {
      const error = new Error('Coupon code is required.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!isUpdate || data.type !== undefined) {
    if (!['percentage', 'fixed'].includes(data.type)) {
      const error = new Error('Coupon type must be "percentage" or "fixed".');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!isUpdate || data.value !== undefined) {
    const val = Number(data.value);
    if (isNaN(val) || val <= 0) {
      const error = new Error('Discount value must be a positive number greater than 0.');
      error.statusCode = 400;
      throw error;
    }
    if (data.type === 'percentage' && val > 100) {
      const error = new Error('Percentage discount cannot exceed 100%.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.minimumOrderValue !== undefined && data.minimumOrderValue !== null) {
    if (Number(data.minimumOrderValue) < 0) {
      const error = new Error('Minimum order value cannot be negative.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.maximumDiscount !== undefined && data.maximumDiscount !== null && data.maximumDiscount !== '') {
    if (Number(data.maximumDiscount) < 0) {
      const error = new Error('Maximum discount cap cannot be negative.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== '') {
    if (Number(data.usageLimit) < 1) {
      const error = new Error('Usage limit must be at least 1.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.perUserLimit !== undefined && data.perUserLimit !== null) {
    if (Number(data.perUserLimit) < 1) {
      const error = new Error('Per-user usage limit must be at least 1.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!isUpdate || data.expiresAt !== undefined) {
    if (!data.expiresAt) {
      const error = new Error('Expiry date is required.');
      error.statusCode = 400;
      throw error;
    }
    const expDate = new Date(data.expiresAt);
    if (isNaN(expDate.getTime())) {
      const error = new Error('Invalid expiry date format.');
      error.statusCode = 400;
      throw error;
    }

    if (data.startsAt) {
      const startDate = new Date(data.startsAt);
      if (expDate <= startDate) {
        const error = new Error('Expiry date must be after the start date.');
        error.statusCode = 400;
        throw error;
      }
    }
  }
};

const couponService = {
  memoryCoupons,
  validateCouponInput,

  validateCoupon: async ({ code, userId, cartItems = [], subtotal = 0 }) => {
    if (!code || !code.trim()) {
      const error = new Error('Coupon code is required.');
      error.statusCode = 400;
      error.code = 'COUPON_REQUIRED';
      throw error;
    }

    const normalizedCode = code.trim().toUpperCase();
    const isDb = Coupon.db.readyState === 1;

    let coupon = null;
    if (isDb) {
      coupon = await Coupon.findOne({ code: normalizedCode });
    } else {
      coupon = memoryCoupons.find((c) => c.code === normalizedCode);
    }

    if (!coupon) {
      const error = new Error(`Coupon code '${normalizedCode}' not found.`);
      error.statusCode = 404;
      error.code = 'COUPON_NOT_FOUND';
      throw error;
    }

    if (!coupon.isActive) {
      const error = new Error('This coupon is currently inactive.');
      error.statusCode = 400;
      error.code = 'COUPON_INACTIVE';
      throw error;
    }

    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
      const error = new Error('This coupon promotion has not started yet.');
      error.statusCode = 400;
      error.code = 'COUPON_NOT_STARTED';
      throw error;
    }

    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      const error = new Error('This coupon code has expired.');
      error.statusCode = 400;
      error.code = 'COUPON_EXPIRED';
      throw error;
    }

    if (subtotal < (coupon.minimumOrderValue || 0)) {
      const error = new Error(
        `Minimum order value of ₹${(coupon.minimumOrderValue || 0).toLocaleString()} required for code '${coupon.code}'.`
      );
      error.statusCode = 400;
      error.code = 'MINIMUM_ORDER_NOT_MET';
      throw error;
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && (coupon.usedCount || 0) >= coupon.usageLimit) {
      const error = new Error('This coupon usage limit has been reached.');
      error.statusCode = 400;
      error.code = 'COUPON_USAGE_LIMIT_REACHED';
      throw error;
    }

    // Per-user usage validation
    if (userId && coupon.perUserLimit) {
      if (isDb) {
        const userOrdersWithCoupon = await Order.countDocuments({
          user: userId,
          promoCode: coupon.code,
          'payment.status': { $in: ['paid', 'pending'] },
          orderStatus: { $ne: 'cancelled' },
        });

        if (userOrdersWithCoupon >= coupon.perUserLimit) {
          const error = new Error('You have already used this coupon code.');
          error.statusCode = 400;
          error.code = 'PER_USER_LIMIT_EXCEEDED';
          throw error;
        }
      }
    }

    // Calculate discount amount
    let eligibleSubtotal = subtotal;
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = Math.round((eligibleSubtotal * coupon.value) / 100);
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, eligibleSubtotal);
    }

    return {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      minimumOrderValue: coupon.minimumOrderValue || 0,
      maximumDiscount: coupon.maximumDiscount || null,
      coupon,
    };
  },

  recordCouponUsage: async (code) => {
    if (!code) return;
    const normalizedCode = code.trim().toUpperCase();
    if (Coupon.db.readyState === 1) {
      await Coupon.findOneAndUpdate({ code: normalizedCode }, { $inc: { usedCount: 1 } });
    } else {
      const c = memoryCoupons.find((cp) => cp.code === normalizedCode);
      if (c) c.usedCount = (c.usedCount || 0) + 1;
    }
  },

  listCouponsAdmin: async ({ page = 1, limit = 20, search, status, type } = {}) => {
    const isDb = Coupon.db.readyState === 1;

    if (isDb) {
      const query = {};
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (type && type !== 'all') query.type = type;
      if (search && search.trim()) {
        query.code = new RegExp(search.trim(), 'i');
      }

      const numericPage = Math.max(1, parseInt(page, 10));
      const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const skip = (numericPage - 1) * numericLimit;

      const [coupons, totalCoupons] = await Promise.all([
        Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
        Coupon.countDocuments(query),
      ]);

      return {
        coupons,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalCoupons,
          totalPages: Math.ceil(totalCoupons / numericLimit) || 1,
        },
      };
    }

    // Memory Fallback
    let list = [...memoryCoupons];
    if (status === 'active') list = list.filter((c) => c.isActive);
    if (status === 'inactive') list = list.filter((c) => !c.isActive);
    if (type && type !== 'all') list = list.filter((c) => c.type === type);
    if (search && search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((c) => c.code.includes(q));
    }

    return {
      coupons: list,
      pagination: {
        page: 1,
        limit: 100,
        totalCoupons: list.length,
        totalPages: 1,
      },
    };
  },

  createCoupon: async (couponData, adminUser) => {
    validateCouponInput(couponData, false);

    const code = couponData.code.trim().toUpperCase();
    const isDb = Coupon.db.readyState === 1;

    if (isDb) {
      const existing = await Coupon.findOne({ code });
      if (existing) {
        const error = new Error(`Coupon with code '${code}' already exists.`);
        error.statusCode = 400;
        error.code = 'DUPLICATE_COUPON';
        throw error;
      }

      const coupon = await Coupon.create({
        ...couponData,
        code,
        createdBy: adminUser ? adminUser._id : null,
      });

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'CREATE_COUPON',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        metadata: { code: coupon.code, type: coupon.type, value: coupon.value },
      });

      return coupon;
    }

    // Memory Fallback
    const existing = memoryCoupons.find((c) => c.code === code);
    if (existing) {
      const error = new Error(`Coupon with code '${code}' already exists.`);
      error.statusCode = 400;
      error.code = 'DUPLICATE_COUPON';
      throw error;
    }

    const coupon = {
      _id: `coup_${Date.now()}`,
      id: `coup_${Date.now()}`,
      ...couponData,
      code,
      usedCount: 0,
      isActive: couponData.isActive !== undefined ? Boolean(couponData.isActive) : true,
      createdAt: new Date(),
    };
    memoryCoupons.push(coupon);
    return coupon;
  },

  updateCoupon: async (id, couponData, adminUser) => {
    validateCouponInput(couponData, true);

    const isDb = Coupon.db.readyState === 1;

    if (isDb) {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        const error = new Error('Coupon not found.');
        error.statusCode = 404;
        throw error;
      }

      if (couponData.code) {
        const newCode = couponData.code.trim().toUpperCase();
        if (newCode !== coupon.code) {
          const existing = await Coupon.findOne({ code: newCode });
          if (existing) {
            const error = new Error(`Coupon with code '${newCode}' already exists.`);
            error.statusCode = 400;
            throw error;
          }
          couponData.code = newCode;
        }
      }

      Object.assign(coupon, couponData);
      await coupon.save();

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'UPDATE_COUPON',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        metadata: { code: coupon.code },
      });

      return coupon;
    }

    // Memory Fallback
    const coupon = memoryCoupons.find((c) => c._id === id || c.id === id);
    if (!coupon) {
      const error = new Error('Coupon not found.');
      error.statusCode = 404;
      throw error;
    }

    if (couponData.code) {
      const newCode = couponData.code.trim().toUpperCase();
      if (newCode !== coupon.code) {
        const existing = memoryCoupons.find((c) => c.code === newCode);
        if (existing) {
          const error = new Error(`Coupon with code '${newCode}' already exists.`);
          error.statusCode = 400;
          throw error;
        }
        couponData.code = newCode;
      }
    }

    Object.assign(coupon, couponData);
    return coupon;
  },

  updateCouponStatus: async (id, isActive, adminUser) => {
    const isDb = Coupon.db.readyState === 1;

    if (isDb) {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        const error = new Error('Coupon not found.');
        error.statusCode = 404;
        throw error;
      }

      coupon.isActive = Boolean(isActive);
      await coupon.save();

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'TOGGLE_COUPON_STATUS',
        entity: 'Coupon',
        entityId: coupon._id.toString(),
        metadata: { code: coupon.code, isActive: coupon.isActive },
      });

      return coupon;
    }

    // Memory Fallback
    const coupon = memoryCoupons.find((c) => c._id === id || c.id === id);
    if (!coupon) {
      const error = new Error('Coupon not found.');
      error.statusCode = 404;
      throw error;
    }

    coupon.isActive = Boolean(isActive);
    return coupon;
  },

  deleteCoupon: async (id, adminUser) => {
    const isDb = Coupon.db.readyState === 1;

    if (isDb) {
      const coupon = await Coupon.findByIdAndDelete(id);
      if (!coupon) {
        const error = new Error('Coupon not found.');
        error.statusCode = 404;
        throw error;
      }

      await AuditLog.create({
        user: adminUser ? adminUser._id : null,
        action: 'DELETE_COUPON',
        entity: 'Coupon',
        entityId: id,
        metadata: { code: coupon.code },
      });

      return true;
    }

    // Memory Fallback
    const idx = memoryCoupons.findIndex((c) => c._id === id || c.id === id);
    if (idx === -1) {
      const error = new Error('Coupon not found.');
      error.statusCode = 404;
      throw error;
    }
    memoryCoupons.splice(idx, 1);
    return true;
  },
};

module.exports = couponService;
