const mongoose = require('mongoose');
const User = require('../models/User');
const { memoryUsers } = require('./authService');

const getUserHelper = async (userId) => {
  if (User.db.readyState === 1 && userId) {
    if (mongoose.Types.ObjectId.isValid(userId) && /^[0-9a-fA-F]{24}$/.test(String(userId))) {
      const user = await User.findById(userId);
      if (user) return user;
    }
    const userExt = await User.findOne({
      $or: [
        { googleId: String(userId) },
        { firebaseUid: String(userId) },
        { providerId: String(userId) },
      ],
    });
    if (userExt) return userExt;
  }
  if (memoryUsers) {
    if (memoryUsers[userId]) return memoryUsers[userId];
    const foundMem = Object.values(memoryUsers).find(
      (u) =>
        String(u._id) === String(userId) ||
        String(u.id) === String(userId) ||
        String(u.googleId) === String(userId) ||
        String(u.firebaseUid) === String(userId) ||
        String(u.providerId) === String(userId)
    );
    if (foundMem) return foundMem;
  }
  const error = new Error('User not found');
  error.statusCode = 404;
  throw error;
};

const addressService = {
  // Get all user addresses
  getAddresses: async (userId) => {
    const user = await getUserHelper(userId);
    return user.addresses || [];
  },

  // Add new address
  addAddress: async (userId, addressData) => {
    const user = await getUserHelper(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isFirst = user.addresses.length === 0;
    const shouldBeDefault = addressData.isDefault || isFirst;

    if (shouldBeDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      label: addressData.label || 'Home',
      fullName: addressData.fullName,
      phone: addressData.phone,
      addressLine1: addressData.addressLine1,
      addressLine2: addressData.addressLine2 || '',
      landmark: addressData.landmark || '',
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode,
      country: addressData.country || 'India',
      isDefault: shouldBeDefault,
    };

    user.addresses.push(newAddress);
    await user.save();
    return user.addresses;
  },

  // Update existing address
  updateAddress: async (userId, addressId, addressData) => {
    const user = await getUserHelper(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const addrIndex = user.addresses.findIndex(
      (a) => a._id.toString() === addressId.toString()
    );

    if (addrIndex === -1) {
      const error = new Error('Address not found');
      error.statusCode = 404;
      throw error;
    }

    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const existing = user.addresses[addrIndex];
    user.addresses[addrIndex] = {
      ...existing.toObject(),
      ...addressData,
      _id: existing._id,
    };

    await user.save();
    return user.addresses;
  },

  // Delete address
  deleteAddress: async (userId, addressId) => {
    const user = await getUserHelper(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const targetAddr = user.addresses.id(addressId);
    if (!targetAddr) {
      const error = new Error('Address not found');
      error.statusCode = 404;
      throw error;
    }

    const wasDefault = targetAddr.isDefault;
    user.addresses.pull(addressId);

    // If deleted address was default, set first remaining as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  },

  // Set primary/default address
  setDefaultAddress: async (userId, addressId) => {
    const user = await getUserHelper(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    let found = false;
    user.addresses.forEach((addr) => {
      if (addr._id.toString() === addressId.toString()) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) {
      const error = new Error('Address not found');
      error.statusCode = 404;
      throw error;
    }

    await user.save();
    return user.addresses;
  },
};

module.exports = addressService;
