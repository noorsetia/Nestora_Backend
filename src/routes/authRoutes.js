const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} = require('../validators/authValidator');
const env = require('../config/env');

// Public Auth Endpoints
router.post('/register', validate(validateRegisterInput), authController.register);
router.post('/login', validate(validateLoginInput), authController.login);
router.post('/google', authController.googleAuth);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(validateForgotPasswordInput), authController.forgotPassword);
router.post('/reset-password', validate(validateResetPasswordInput), authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Protected Auth Endpoints
router.get('/me', protect, authController.getMe);
router.get('/current-user', protect, authController.getMe);
router.get('/current-user/profile', protect, authController.getMe);
router.get('/profile', protect, authController.getMe);

const getFrontendUrl = (req) => {
  return env.frontendUrl || 'http://localhost:5173';
};

const handleGoogleCallback = async (req, res, next) => {
  const frontendUrl = getFrontendUrl(req);

  // 1. Check for errors from Google OAuth
  if (req.query?.error || req.body?.error) {
    const errType = req.query?.error || req.body?.error;
    if (errType === 'access_denied') {
      return res.redirect(`${frontendUrl}/login?error=google_denied`);
    }
    return res.redirect(`${frontendUrl}/login?error=google_callback_failed`);
  }

  // 2. Extract id_token or credential from req.body or req.query
  const idToken = req.body?.id_token || req.body?.credential || req.query?.id_token || req.query?.credential;

  if (idToken) {
    try {
      const decoded = jwt.decode(idToken);
      if (decoded && (decoded.sub || decoded.email)) {
        const authService = require('../services/authService');
        const firstName = decoded.given_name || (decoded.name ? decoded.name.split(' ')[0] : 'Google User');
        const lastName = decoded.family_name || (decoded.name ? decoded.name.split(' ').slice(1).join(' ') : '');
        const result = await authService.loginWithGoogle({
          googleId: decoded.sub,
          email: decoded.email,
          firstName,
          lastName,
          displayName: decoded.name || `${firstName} ${lastName}`.trim(),
          avatar: decoded.picture || '',
        });

        res.cookie('token', result.token, result.cookieOptions);
        const targetPath = ['admin', 'superadmin'].includes(result.user.role) ? '/admin' : '/profile';
        const isNew = result.isNewUser ? 'true' : 'false';
        return res.redirect(`${frontendUrl}${targetPath}?token=${result.token}&google_auth=success&is_new=${isNew}`);
      }
    } catch (tokenErr) {
      console.error('❌ Google ID Token Parsing Error:', tokenErr);
    }
  }

  // 3. Check custom query parameters if present (such as email, googleId, uid)
  if (req.query && (req.query.email || req.query.googleId || req.query.uid || req.query.firebaseUid)) {
    try {
      const authService = require('../services/authService');
      const result = await authService.loginWithGoogle({
        googleId: req.query.googleId || req.query.uid,
        firebaseUid: req.query.firebaseUid || req.query.uid,
        email: req.query.email,
        firstName: req.query.firstName || (req.query.name ? req.query.name.split(' ')[0] : ''),
        lastName: req.query.lastName || (req.query.name ? req.query.name.split(' ').slice(1).join(' ') : ''),
        displayName: req.query.displayName || req.query.name,
        avatar: req.query.avatar || req.query.photoURL,
      });
      res.cookie('token', result.token, result.cookieOptions);
      const targetPath = ['admin', 'superadmin'].includes(result.user.role) ? '/admin' : '/profile';
      const isNew = result.isNewUser ? 'true' : 'false';
      return res.redirect(`${frontendUrl}${targetPath}?token=${result.token}&google_auth=success&is_new=${isNew}`);
    } catch (fallbackErr) {
      console.error('❌ OAuth Query Params Resolution Error:', fallbackErr);
    }
  }

  // 4. Passport code authentication fallback
  if (req.query?.code) {
    return passport.authenticate('google', { session: false }, async (err, user, info) => {
      if (user && !err) {
        const { generateToken, getCookieOptions } = require('../utils/generateToken');
        const token = generateToken(user._id || user.id, user.role);
        res.cookie('token', token, getCookieOptions());
        const targetPath = ['admin', 'superadmin'].includes(user.role) ? '/admin' : '/profile';
        const isNew = user.isNewUser ? 'true' : 'false';
        return res.redirect(`${frontendUrl}${targetPath}?token=${token}&google_auth=success&is_new=${isNew}`);
      }
      console.error('❌ Google Passport Code Exchange failed:', err || info);
      return res.redirect(`${frontendUrl}/login?error=google_callback_failed`);
    })(req, res, next);
  }

  return res.redirect(`${frontendUrl}/login?error=google_callback_failed`);
};

// Passport Google OAuth routes
if (env.googleClientId) {
  router.get('/google/login', (req, res) => {
    const googleClientId = env.googleClientId;
    const callbackUrl = env.googleCallbackUrl;
    const nonce = crypto.randomBytes(16).toString('hex');
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=id_token&scope=openid%20profile%20email&nonce=${nonce}&response_mode=form_post&prompt=select_account`;
    return res.redirect(googleAuthUrl);
  });
  router.get('/google/callback', handleGoogleCallback);
  router.post('/google/callback', handleGoogleCallback);
} else {
  router.get('/google/login', (req, res) => {
    const targetUrl = getFrontendUrl(req);
    return res.redirect(`${targetUrl}/login?error=missing_google_id`);
  });
  router.get('/google/callback', (req, res) => {
    const targetUrl = getFrontendUrl(req);
    return res.redirect(`${targetUrl}/login?error=google_failed`);
  });
  router.post('/google/callback', (req, res) => {
    const targetUrl = getFrontendUrl(req);
    return res.redirect(`${targetUrl}/login?error=google_failed`);
  });
}

module.exports = router;
