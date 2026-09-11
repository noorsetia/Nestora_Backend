const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Deterministically resolve .env location using absolute paths
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), 'nestora/backend/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];

const envPath = possibleEnvPaths.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nestora',
  jwtSecret: process.env.JWT_SECRET || 'nestora_super_secret_jwt_key_2026_dev_env',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  frontendUrl: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_nestora_dummy_id',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_secret_key_123456789',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

// Safe diagnostic logging function
config.logGoogleStatus = () => {
  console.log('==================================================');
  console.log(`GOOGLE_CLIENT_ID configured: ${!!config.googleClientId}`);
  console.log(`GOOGLE_CLIENT_SECRET configured: ${!!config.googleClientSecret}`);
  console.log(`GOOGLE_CALLBACK_URL: ${config.googleCallbackUrl}`);
  console.log('==================================================');
};

// Validate environment variables in production
if (config.nodeEnv === 'production') {
  const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ CRITICAL CONFIG ERROR: Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = config;
