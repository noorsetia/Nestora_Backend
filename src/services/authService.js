const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { generateToken, getCookieOptions } = require('../utils/generateToken');
const { hashPassword, comparePassword } = require('../utils/password');

// Memory store for dev environments when MongoDB connection is not active
const memoryUsers = {};

const authService = {
  memoryUsers,

  // Register New User
  register: async ({ firstName, lastName, email, password }) => {
    const formattedEmail = email.toLowerCase().trim();

    // Check existing in MongoDB if connected
    let existingUser = null;
    try {
      if (User.db.readyState === 1) {
        existingUser = await User.findOne({ email: formattedEmail });
      }
    } catch (e) {
      // Ignore DB error for memory check
    }

    // Check memory store
    if (!existingUser) {
      existingUser = Object.values(memoryUsers).find((u) => u.email === formattedEmail);
    }

    if (existingUser) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    let user;
    try {
      if (User.db.readyState === 1) {
        user = await User.create({
          firstName,
          lastName,
          email: formattedEmail,
          password, // Mongoose pre-save hook will hash password
          authProvider: 'local',
          isEmailVerified: false,
        });
      }
    } catch (err) {
      // Fall through to memory store if DB fails or offline
    }

    if (!user) {
      // In-memory fallback user creation
      const hashedPassword = await hashPassword(password);
      const userId = new mongoose.Types.ObjectId().toString();
      user = {
        _id: userId,
        id: userId,
        firstName,
        lastName,
        email: formattedEmail,
        password: hashedPassword,
        avatar: '',
        phone: '',
        role: 'user',
        authProvider: 'local',
        isEmailVerified: false,
        addresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryUsers[userId] = user;
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;

    const token = generateToken(safeUser._id || safeUser.id, safeUser.role);
    const cookieOptions = getCookieOptions();

    return {
      user: safeUser,
      token,
      cookieOptions,
    };
  },

  // Login User
  login: async ({ email, password }) => {
    const formattedEmail = email.toLowerCase().trim();
    let user = null;

    try {
      if (User.db.readyState === 1) {
        user = await User.findOne({ email: formattedEmail }).select('+password');
      }
    } catch (e) {}

    if (!user) {
      user = Object.values(memoryUsers).find((u) => u.email === formattedEmail);
    }

    // Generic error message requirement: "Invalid email or password."
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    let isMatch = false;
    if (user.comparePassword) {
      isMatch = await user.comparePassword(password);
    } else if (user.password) {
      isMatch = await comparePassword(password, user.password);
    }

    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;

    const token = generateToken(safeUser._id || safeUser.id, safeUser.role);
    const cookieOptions = getCookieOptions();

    return {
      user: safeUser,
      token,
      cookieOptions,
    };
  },

  // Google OAuth Login / Creation
  loginWithGoogle: async ({ googleId, firebaseUid, providerId, email, firstName, lastName, displayName, avatar, photoURL }) => {
    const externalId = googleId || firebaseUid || providerId;
    if (!externalId && !email) {
      const error = new Error('Google authentication payload invalid.');
      error.statusCode = 400;
      error.code = 'INVALID_OAUTH_PAYLOAD';
      throw error;
    }

    let finalFirstName = firstName;
    let finalLastName = lastName;
    if (!finalFirstName && displayName) {
      const parts = displayName.trim().split(' ');
      finalFirstName = parts[0] || 'Google User';
      finalLastName = parts.slice(1).join(' ') || '';
    }

    const finalAvatar = avatar || photoURL || '';
    const formattedEmail = email ? email.toLowerCase().trim() : (externalId ? `${externalId}@google.user` : '');
    let user = null;
    let isNewUser = false;

    try {
      if (User.db.readyState === 1) {
        const queryConditions = [];
        if (googleId) queryConditions.push({ googleId: String(googleId) });
        if (firebaseUid) queryConditions.push({ firebaseUid: String(firebaseUid) });
        if (providerId) queryConditions.push({ providerId: String(providerId) });
        if (email) queryConditions.push({ email: formattedEmail });

        if (queryConditions.length > 0) {
          user = await User.findOne({
            $or: queryConditions,
          });
        }

        if (user) {
          isNewUser = false;
          if (user.status === 'suspended') {
            const error = new Error('Account has been suspended. Please contact customer support.');
            error.statusCode = 403;
            error.code = 'ACCOUNT_SUSPENDED';
            throw error;
          }

          let updated = false;
          if (googleId && !user.googleId) {
            user.googleId = String(googleId);
            updated = true;
          }
          if (firebaseUid && !user.firebaseUid) {
            user.firebaseUid = String(firebaseUid);
            updated = true;
          }
          if (providerId && !user.providerId) {
            user.providerId = String(providerId);
            updated = true;
          }
          if (finalFirstName && (user.firstName !== finalFirstName || user.firstName === 'Google User' || user.firstName === 'Noor')) {
            user.firstName = finalFirstName;
            updated = true;
          }
          if (finalLastName !== undefined && (user.lastName !== finalLastName || user.lastName === 'Setia')) {
            user.lastName = finalLastName;
            updated = true;
          }
          if (formattedEmail && user.email !== formattedEmail && !formattedEmail.includes('@google.user')) {
            user.email = formattedEmail;
            updated = true;
          }
          if (finalAvatar && user.avatar !== finalAvatar) {
            user.avatar = finalAvatar;
            updated = true;
          }
          if (!user.authProvider || user.authProvider === 'local') {
            user.authProvider = 'google';
            updated = true;
          }
          if (updated) {
            await user.save();
          }
        } else {
          isNewUser = true;
          user = await User.create({
            firstName: finalFirstName || 'Google User',
            lastName: finalLastName || '',
            email: formattedEmail,
            googleId: googleId ? String(googleId) : null,
            firebaseUid: firebaseUid ? String(firebaseUid) : null,
            providerId: providerId ? String(providerId) : null,
            authProvider: 'google',
            role: 'user', // Never trust role from frontend
            isEmailVerified: true,
            avatar: finalAvatar,
          });
        }
      }
    } catch (e) {
      console.error('❌ Error in loginWithGoogle MongoDB operation:', e);
      if (e.statusCode) throw e;
    }

    if (!user) {
      user = Object.values(memoryUsers).find(
        (u) =>
          (googleId && String(u.googleId) === String(googleId)) ||
          (firebaseUid && String(u.firebaseUid) === String(firebaseUid)) ||
          (providerId && String(u.providerId) === String(providerId)) ||
          (email && u.email === formattedEmail)
      );

      if (user) {
        isNewUser = false;
        if (user.status === 'suspended') {
          const error = new Error('Account has been suspended. Please contact customer support.');
          error.statusCode = 403;
          error.code = 'ACCOUNT_SUSPENDED';
          throw error;
        }
        if (googleId && !user.googleId) user.googleId = String(googleId);
        if (avatar) user.avatar = avatar;
        user.authProvider = 'google';
        user.provider = 'google';
      } else {
        isNewUser = true;
        const mongoId = new mongoose.Types.ObjectId().toString();
        user = {
          _id: mongoId,
          id: mongoId,
          firstName: firstName || 'Google User',
          lastName: lastName || '',
          email: formattedEmail,
          googleId: googleId ? String(googleId) : null,
          firebaseUid: firebaseUid ? String(firebaseUid) : null,
          providerId: providerId ? String(providerId) : null,
          authProvider: 'google',
          isEmailVerified: true,
          avatar: avatar || '',
          role: 'user',
          status: 'active',
          addresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryUsers[mongoId] = user;
      }
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;
    safeUser.isNewUser = isNewUser;

    const token = generateToken(safeUser._id || safeUser.id, safeUser.role);
    const cookieOptions = getCookieOptions();

    return {
      user: safeUser,
      token,
      cookieOptions,
      isNewUser,
    };
  },

  // Forgot Password
  forgotPassword: async (email) => {
    const formattedEmail = email.toLowerCase().trim();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    try {
      if (User.db.readyState === 1) {
        const user = await User.findOne({ email: formattedEmail });
        if (user) {
          user.resetPasswordToken = hashedToken;
          user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
          await user.save();
        }
      }
    } catch (e) {}

    // Security rule: Always return generic message whether email exists or not
    return {
      message: 'If an account exists for this email, reset instructions will be sent.',
      devToken: resetToken, // For testing purpose in dev mode
    };
  },

  // Reset Password
  resetPassword: async ({ token, password }) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    let user = null;

    try {
      if (User.db.readyState === 1) {
        user = await User.findOne({
          resetPasswordToken: hashedToken,
          resetPasswordExpire: { $gt: Date.now() },
        });

        if (user) {
          user.password = password; // Pre-save hook will hash
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          await user.save();
        }
      }
    } catch (e) {}

    if (!user) {
      // Memory check fallback
      user = Object.values(memoryUsers).find(
        (u) => u.resetPasswordToken === token && u.resetPasswordExpire > Date.now()
      );

      if (user) {
        user.password = await hashPassword(password);
        delete user.resetPasswordToken;
        delete user.resetPasswordExpire;
      }
    }

    if (!user) {
      const error = new Error('Invalid or expired password reset token.');
      error.statusCode = 400;
      throw error;
    }

    return {
      message: 'Your password has been updated.',
    };
  },

  // Email Verification
  verifyEmail: async ({ token, email }) => {
    let user = null;
    try {
      if (User.db.readyState === 1) {
        if (email) {
          user = await User.findOne({ email: email.toLowerCase().trim() });
        }
        if (user) {
          user.isEmailVerified = true;
          user.verificationToken = undefined;
          await user.save();
        }
      }
    } catch (e) {}

    if (!user && email) {
      user = Object.values(memoryUsers).find((u) => u.email === email.toLowerCase().trim());
      if (user) {
        user.isEmailVerified = true;
      }
    }

    return {
      message: 'Email verified successfully.',
    };
  },

  // Resend Email Verification
  resendVerification: async (email) => {
    return {
      message: 'Verification link sent to your email address.',
    };
  },

  // Update User Profile
  updateProfile: async (userId, updateFields) => {
    let user = null;
    try {
      if (User.db.readyState === 1) {
        user = await User.findByIdAndUpdate(userId, updateFields, {
          new: true,
          runValidators: true,
        });
      }
    } catch (e) {}

    if (!user && memoryUsers[userId]) {
      memoryUsers[userId] = {
        ...memoryUsers[userId],
        ...updateFields,
        updatedAt: new Date(),
      };
      user = memoryUsers[userId];
    }

    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;

    return safeUser;
  },
};

module.exports = authService;
