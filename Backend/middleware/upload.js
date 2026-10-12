const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
};

const commonConfig = {
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
};

const uploadProfile = multer(commonConfig);
const uploadLogo = multer(commonConfig);
const uploadCourseImage = multer(commonConfig);

module.exports = { uploadProfile, uploadLogo, uploadCourseImage };
