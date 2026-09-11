const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Handle Mongoose duplicate key error (409 Conflict)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with this ${field} already exists.`;
    errorCode = 'DUPLICATE_KEY_ERROR';
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format for ${err.path || 'resource'}`;
    errorCode = 'INVALID_ID_FORMAT';
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authorization token.';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authorization token has expired.';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size limit exceeded. Maximum allowed file size is 5MB.';
    errorCode = 'FILE_TOO_LARGE';
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
    message = err.message || 'Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed.';
    errorCode = 'INVALID_FILE_TYPE';
  }

  // Production error masking for unhandled server errors (500)
  if (env.nodeEnv === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
