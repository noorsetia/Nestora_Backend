const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home', trim: true },
  title: { type: String, default: 'Home' }, // backward compatibility
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, default: '', trim: true },
  street: { type: String, default: '' }, // backward compatibility
  apartment: { type: String, default: '' }, // backward compatibility
  landmark: { type: String, default: '', trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  isDefault: { type: Boolean, default: false },
});

const userPreferencesSchema = new mongoose.Schema({
  favoriteStyles: [{ type: String, trim: true }],
  favoriteRooms: [{ type: String, trim: true }],
  preferredBudgetRange: {
    min: { type: Number, default: 10000 },
    max: { type: Number, default: 200000 },
  },
  quizStyle: { type: String, default: '' },
});

const notificationPreferencesSchema = new mongoose.Schema({
  email: {
    orderUpdates: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    reviews: { type: Boolean, default: true },
  },
  inApp: {
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
  },
});

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    firebaseUid: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    providerId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'firebase'],
      default: 'local',
    },
    phone: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpire: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({
        email: { orderUpdates: true, paymentUpdates: true, promotions: true, reviews: true },
        inApp: { orderUpdates: true, promotions: true },
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (never return password or tokens)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.verificationTokenExpire;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.__v;
  obj.provider = obj.authProvider || 'local';
  obj.profileImage = obj.avatar || '';
  return obj;
};

module.exports = mongoose.model('User', userSchema);
