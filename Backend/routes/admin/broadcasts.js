// routes/admin/broadcasts.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');
const {
  createBroadcast,
  listBroadcasts,
  deleteBroadcast
} = require('../../controllers/admin/broadcasts');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
});

router.get('/', protect, isAdmin, listBroadcasts);
router.post('/', protect, isAdmin, upload.single('image'), createBroadcast);
router.delete('/:id', protect, isAdmin, deleteBroadcast);

module.exports = router;
