// controllers/admin/broadcasts.js
const Broadcast = require('../../models/Broadcast');
const Notification = require('../../models/Notification');
const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const { deleteImage, uploadImage } = require('../../services/mongodbImageService');
const { success, error } = require('../../utils/apiResponse');
const posthog = require('../../config/posthog');

// @desc    Create an admin broadcast and fan out to all recipients
// @route   POST /api/admin/broadcasts
// @access  Admin
const createBroadcast = async (req, res) => {
  let image = null;
  let broadcastCreated = false;
  try {
    const { title, message, audience } = req.body;

    if (!title || !message) {
      return error(res, 400, 'Title and message are required');
    }

    const normalizedAudience = ['all', 'youth', 'organisations'].includes(audience)
      ? audience
      : 'all';

    image = await uploadImage(req.file);

    const broadcast = await Broadcast.create({
      title: title.trim(),
      message: message.trim(),
      image,
      audience: normalizedAudience,
      createdBy: req.user?.id
    });
    broadcastCreated = true;

    const recipients = [];

    if (normalizedAudience === 'all' || normalizedAudience === 'youth') {
      const youthIds = await User.find({ role: 'youth', isActive: { $ne: false } }).select('_id');
      youthIds.forEach((u) => {
        recipients.push({
          recipient: u._id,
          recipientModel: 'User',
          title: broadcast.title,
          message: broadcast.message,
          image: broadcast.image,
          type: 'admin_broadcast',
          reference: broadcast._id,
          referenceModel: 'Broadcast'
        });
      });
    }

    if (normalizedAudience === 'all' || normalizedAudience === 'organisations') {
      const orgIds = await Organisation.find({}).select('_id');
      orgIds.forEach((o) => {
        recipients.push({
          recipient: o._id,
          recipientModel: 'Organisation',
          title: broadcast.title,
          message: broadcast.message,
          image: broadcast.image,
          type: 'admin_broadcast',
          reference: broadcast._id,
          referenceModel: 'Broadcast'
        });
      });
    }

    if (recipients.length > 0) {
      await Notification.insertMany(recipients, { ordered: false });
    }

    broadcast.recipientCount = recipients.length;
    await broadcast.save();

    posthog.capture({
      distinctId: req.user?.id || 'admin',
      event: 'admin broadcast sent',
      properties: {
        broadcast_id: broadcast._id.toString(),
        audience: normalizedAudience,
        recipient_count: recipients.length,
        has_image: !!broadcast.image
      }
    });

    return success(res, 201, 'Broadcast sent', broadcast);

  } catch (err) {
    if (!broadcastCreated) {
      await deleteImage(image).catch((cleanupError) => {
        console.error('Failed to remove unreferenced MongoDB broadcast image:', cleanupError.message);
      });
    }
    return error(res, err.statusCode || 500, err.message);
  }
};

// @desc    List previous broadcasts
// @route   GET /api/admin/broadcasts
// @access  Admin
const listBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.find()
      .sort({ createdAt: -1 })
      .limit(100);
    return success(res, 200, 'Broadcasts fetched', broadcasts);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Delete a broadcast (and its notifications)
// @route   DELETE /api/admin/broadcasts/:id
// @access  Admin
const deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return error(res, 404, 'Broadcast not found');

    await Notification.deleteMany({
      type: 'admin_broadcast',
      reference: broadcast._id
    });
    await broadcast.deleteOne();
    await deleteImage(broadcast.image).catch((err) => {
      console.error('Failed to remove deleted broadcast image from MongoDB:', err.message);
    });

    return success(res, 200, 'Broadcast deleted');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { createBroadcast, listBroadcasts, deleteBroadcast };
