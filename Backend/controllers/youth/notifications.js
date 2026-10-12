// controllers/youth/notifications.js
const Notification = require('../../models/Notification');
const { success, error } = require('../../utils/apiResponse');

// @desc    Get youth notifications
// @route   GET /api/youth/notifications
// @access  Youth
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
      recipientModel: 'User'
    })
      .populate('sender', 'fullName photo name logo')
      .sort({ createdAt: -1 });

    return success(res, 200, 'Notifications fetched', notifications);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/youth/notifications/:id/read
// @access  Youth
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return error(res, 404, 'Notification not found');
    }

    notification.isRead = true;
    await notification.save();

    return success(res, 200, 'Notification marked as read', notification);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/youth/notifications/read-all
// @access  Youth
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    return success(res, 200, 'All notifications marked as read');

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };