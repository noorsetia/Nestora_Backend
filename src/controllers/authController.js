const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const result = await authService.register({ firstName, lastName, email, password });

    res.cookie('token', result.token, result.cookieOptions);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: result.user,
        token: result.token,
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

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.cookie('token', result.token, result.cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token,
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

const googleAuth = async (req, res, next) => {
  try {
    const {
      googleId,
      firebaseUid,
      providerId,
      uid,
      email,
      firstName,
      lastName,
      displayName,
      avatar,
      photoURL,
    } = req.body;

    const result = await authService.loginWithGoogle({
      googleId: googleId || uid || firebaseUid || providerId,
      firebaseUid: firebaseUid || uid,
      providerId,
      email,
      firstName,
      lastName,
      displayName,
      avatar: avatar || photoURL,
    });

    res.cookie('token', result.token, result.cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code || 'AUTH_ERROR',
      });
    }
    next(error);
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

const getMe = async (req, res) => {
  const user = req.user.toJSON ? req.user.toJSON() : { ...req.user };
  delete user.password;

  return res.status(200).json({
    success: true,
    data: {
      user,
    },
    user,
  });
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      ...(result.devToken && { devToken: result.devToken }),
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword({ token, password });

    return res.status(200).json({
      success: true,
      message: result.message,
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

const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;
    const result = await authService.verifyEmail({ token, email });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendVerification(email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
