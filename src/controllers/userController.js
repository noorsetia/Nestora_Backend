const authService = require('../services/authService');
const User = require('../models/User');

const getProfile = async (req, res, next) => {
  try {
    const user = req.user.toJSON ? req.user.toJSON() : { ...req.user };
    delete user.password;

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
      user,
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    // Whitelist profile update fields to prevent privilege escalation via body.role or status
    const allowedFields = {};
    if (req.body.firstName !== undefined) allowedFields.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) allowedFields.lastName = req.body.lastName;
    if (req.body.phone !== undefined) allowedFields.phone = req.body.phone;
    if (req.body.avatar !== undefined) allowedFields.avatar = req.body.avatar;

    const updatedUser = await authService.updateProfile(userId, allowedFields);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let preferences = {};
    if (User.db.readyState === 1) {
      const user = await User.findById(userId);
      preferences = user ? user.preferences || {} : {};
    } else if (authService.memoryUsers[userId]) {
      preferences = authService.memoryUsers[userId].preferences || {};
    }
    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let preferences = {};
    if (User.db.readyState === 1) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      user.preferences = {
        ...user.preferences,
        ...req.body,
      };
      await user.save();
      preferences = user.preferences;
    } else if (authService.memoryUsers[userId]) {
      const u = authService.memoryUsers[userId];
      u.preferences = { ...u.preferences, ...req.body };
      preferences = u.preferences;
    }

    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.',
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const userId = req.user._id || req.user.id;
    let user = null;
    if (User.db.readyState === 1) {
      user = await User.findById(userId).select('+password');
    }

    if (!user) {
      user = authService.memoryUsers[userId];
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let isMatch = false;
    if (user.comparePassword) {
      isMatch = await user.comparePassword(currentPassword);
    } else if (user.password) {
      const { comparePassword } = require('../utils/password');
      isMatch = await comparePassword(currentPassword, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    if (user.save) {
      user.password = newPassword;
      await user.save();
    } else {
      const { hashPassword } = require('../utils/password');
      user.password = await hashPassword(newPassword);
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (User.db.readyState === 1) {
      await User.findByIdAndDelete(userId);
    }
    if (authService.memoryUsers[userId]) {
      delete authService.memoryUsers[userId];
    }

    const { getClearCookieOptions } = require('../utils/generateToken');
    res.clearCookie('token', getClearCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let wishlist = [];
    if (User.db.readyState === 1) {
      const user = await User.findById(userId).populate('wishlist');
      wishlist = user ? user.wishlist || [] : [];
    } else if (authService.memoryUsers[userId]) {
      wishlist = authService.memoryUsers[userId].wishlist || [];
    }
    return res.status(200).json({
      success: true,
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;
    let wishlist = [];

    if (User.db.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        if (!user.wishlist) user.wishlist = [];
        if (!user.wishlist.some(id => id.toString() === productId)) {
          user.wishlist.push(productId);
          await user.save();
        }
        const updated = await User.findById(userId).populate('wishlist');
        wishlist = updated ? updated.wishlist : [];
      }
    } else if (authService.memoryUsers[userId]) {
      const u = authService.memoryUsers[userId];
      if (!u.wishlist) u.wishlist = [];
      if (!u.wishlist.includes(productId)) u.wishlist.push(productId);
      wishlist = u.wishlist;
    }

    return res.status(200).json({
      success: true,
      message: 'Added to wishlist',
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;
    let wishlist = [];

    if (User.db.readyState === 1) {
      const user = await User.findById(userId);
      if (user && user.wishlist) {
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        const updated = await User.findById(userId).populate('wishlist');
        wishlist = updated ? updated.wishlist : [];
      }
    } else if (authService.memoryUsers[userId]) {
      const u = authService.memoryUsers[userId];
      if (u.wishlist) {
        u.wishlist = u.wishlist.filter(id => id !== productId);
        wishlist = u.wishlist;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

const toggleWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;
    let wishlist = [];

    if (User.db.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        if (!user.wishlist) user.wishlist = [];
        const idx = user.wishlist.findIndex(id => id.toString() === productId);
        if (idx > -1) {
          user.wishlist.splice(idx, 1);
        } else {
          user.wishlist.push(productId);
        }
        await user.save();
        const updated = await User.findById(userId).populate('wishlist');
        wishlist = updated ? updated.wishlist : [];
      }
    } else if (authService.memoryUsers[userId]) {
      const u = authService.memoryUsers[userId];
      if (!u.wishlist) u.wishlist = [];
      const idx = u.wishlist.indexOf(productId);
      if (idx > -1) u.wishlist.splice(idx, 1);
      else u.wishlist.push(productId);
      wishlist = u.wishlist;
    }

    return res.status(200).json({
      success: true,
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  changePassword,
  deleteAccount,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
};
