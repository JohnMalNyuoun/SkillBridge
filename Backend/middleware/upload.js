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

const allowedGroupChatAttachmentTypes = [
  ...allowedMimeTypes,
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const groupChatAttachmentFilter = (req, file, cb) => {
  if (allowedGroupChatAttachmentTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Use an image, PDF, text, CSV, Word, or Excel file.'));
};

const uploadGroupChatAttachment = multer({
  storage: multer.memoryStorage(),
  fileFilter: groupChatAttachmentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = {
  uploadProfile,
  uploadLogo,
  uploadCourseImage,
  uploadGroupChatAttachment
};
