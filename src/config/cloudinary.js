const cloudinary = require('cloudinary').v2;
const env = require('./env');

cloudinary.config({
  cloud_name: env.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: env.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY,
  api_secret: env.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
