const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

const getCookieOptions = () => {
  const isProd = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
};

const getClearCookieOptions = () => {
  const isProd = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
};

module.exports = {
  generateToken,
  getCookieOptions,
  getClearCookieOptions,
};

