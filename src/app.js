const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('passport');

const env = require('./config/env');
const setupPassport = require('./config/passport');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const requestLoggerMiddleware = require('./middleware/requestLoggerMiddleware');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const addressRoutes = require('./routes/addressRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminReviewRoutes = require('./routes/adminReviewRoutes');
const adminCouponRoutes = require('./routes/adminCouponRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminAuditLogRoutes = require('./routes/adminAuditLogRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const articleRoutes = require('./routes/articleRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [env.frontendUrl, 'http://localhost:5173', 'http://localhost:5174'];
      if (!origin || allowed.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Structured Request Logger & Request ID Middleware
app.use(requestLoggerMiddleware);

// Request rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Body and cookie parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Initialize Passport for OAuth flows
setupPassport();
app.use(passport.initialize());

// Health Check Endpoints
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  return res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: dbState,
      environment: env.nodeEnv,
    },
  });
});

app.get('/api/health/ready', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (!isDbReady) {
    return res.status(503).json({
      success: false,
      message: 'Service Unavailable: Database connection not ready.',
      data: {
        status: 'unready',
        database: 'disconnected',
      },
    });
  }
  return res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      database: 'connected',
    },
  });
});

app.get('/api/health/live', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      alive: true,
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users/addresses', addressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', reviewRoutes);

// Admin Routes
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/audit-logs', adminAuditLogRoutes);
app.use('/api/admin', adminRoutes);

// 404 & Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
