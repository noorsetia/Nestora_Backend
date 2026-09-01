const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const memoryUsers = require('../services/authService').memoryUsers || {};

const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));
};

const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED',
      });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const userId = decoded.userId;

    let user = null;
    try {
      if (User.db.readyState === 1) {
        if (isValidObjectId(userId)) {
          user = await User.findById(userId);
        }
        if (!user && userId) {
          user = await User.findOne({
            $or: [
              { googleId: String(userId) },
              { firebaseUid: String(userId) },
              { providerId: String(userId) },
              ...(decoded.email ? [{ email: decoded.email.toLowerCase().trim() }] : []),
            ],
          });
        }
      }
    } catch (err) {}

    if (!user && memoryUsers) {
      if (memoryUsers[userId]) {
        user = memoryUsers[userId];
      } else {
        user = Object.values(memoryUsers).find(
          (u) =>
            String(u._id) === String(userId) ||
            String(u.id) === String(userId) ||
            String(u.googleId) === String(userId) ||
            String(u.firebaseUid) === String(userId) ||
            String(u.providerId) === String(userId) ||
            (decoded.email && u.email === decoded.email.toLowerCase().trim())
        );
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User session expired or user no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact customer support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      code: 'INVALID_TOKEN',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.jwtSecret);
      const userId = decoded.userId;

      let user = null;
      if (User.db.readyState === 1) {
        if (isValidObjectId(userId)) {
          user = await User.findById(userId);
        }
        if (!user && userId) {
          user = await User.findOne({
            $or: [
              { googleId: String(userId) },
              { firebaseUid: String(userId) },
              { providerId: String(userId) },
              ...(decoded.email ? [{ email: decoded.email.toLowerCase().trim() }] : []),
            ],
          });
        }
      }
      if (!user && memoryUsers) {
        user =
          memoryUsers[userId] ||
          Object.values(memoryUsers).find(
            (u) =>
              String(u._id) === String(userId) ||
              String(u.id) === String(userId) ||
              String(u.googleId) === String(userId) ||
              String(u.firebaseUid) === String(userId) ||
              String(u.providerId) === String(userId) ||
              (decoded.email && u.email === decoded.email.toLowerCase().trim())
          );
      }
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {}
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions.',
      });
    }
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
};
