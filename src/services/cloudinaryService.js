const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

/**
 * Upload an image buffer directly to Cloudinary.
 * Returns secure Cloudinary URL and public_id.
 */
const uploadToCloudinary = (fileBuffer, folder = 'nestora/products') => {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || cloudinary.config().cloud_name;
    const apiKey = process.env.CLOUDINARY_API_KEY || cloudinary.config().api_key;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || cloudinary.config().api_secret;

    if (!cloudName || !apiKey || !apiSecret) {
      return reject(
        new Error(
          'Cloudinary configuration missing. Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in environment variables.'
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    if (Buffer.isBuffer(fileBuffer)) {
      Readable.from(fileBuffer).pipe(uploadStream);
    } else {
      reject(new Error('Invalid image buffer provided for Cloudinary upload.'));
    }
  });
};

/**
 * Delete an image from Cloudinary by public_id.
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary Delete Error]', err);
    throw err;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
