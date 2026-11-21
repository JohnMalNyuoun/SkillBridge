const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (useCloudinary) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('../config/cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `fursahub/${req.user?.role || 'public'}/${req.body.purpose || 'misc'}`,
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    }),
  });
} else {
  const uploadsRoot = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const sub = `${req.user?.role || 'public'}/${req.body.purpose || 'misc'}`;
      const target = path.join(uploadsRoot, sub);
      fs.mkdirSync(target, { recursive: true });
      cb(null, target);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const safe = crypto.randomBytes(8).toString('hex');
      cb(null, `${Date.now()}-${safe}${ext}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image|video)\//.test(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});

module.exports = { upload, useCloudinary };
