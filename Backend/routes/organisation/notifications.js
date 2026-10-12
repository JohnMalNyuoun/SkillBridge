// routes/organisation/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');
const { success, error } = require('../../utils/apiResponse');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');

router.get('/', protect, isOrganisation, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
      recipientModel: 'Organisation'
    }).sort({ createdAt: -1 });

    return success(res, 200, 'Notifications fetched', notifications);
  } catch (err) {
    return error(res, 500, err.message);
  }
});

router.put('/:id/read', protect, isOrganisation, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) return error(res, 404, 'Notification not found');

    notification.isRead = true;
    await notification.save();

    return success(res, 200, 'Marked as read', notification);
  } catch (err) {
    return error(res, 500, err.message);
  }
});

module.exports = router;