const multer = require('multer');
const path = require('path');

// Memory storage for direct stream upload to Cloudinary
const storage = multer.memoryStorage();

// Allowed file types: JPG, JPEG, PNG, WEBP
const allowedMIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMIME.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

// 5MB file size limit
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

module.exports = upload;
