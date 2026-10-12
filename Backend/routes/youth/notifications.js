// routes/youth/notifications.js
const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../../controllers/youth/notifications');
const { protect } = require('../../middleware/auth');
const { isYouth } = require('../../middleware/isYouth');

router.get('/', protect, isYouth, getNotifications);
router.get('/unread-count', protect, isYouth, async (req, res) => {
  try {
    const Notification = require('../../models/Notification');
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      recipientModel: 'User',
      isRead: false
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
router.put('/read-all', protect, isYouth, markAllAsRead);
router.put('/:id/read', protect, isYouth, markAsRead);

module.exports = router;