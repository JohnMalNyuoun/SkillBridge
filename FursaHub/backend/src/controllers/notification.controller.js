const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

exports.list = asyncHandler(async (req, res) => {
  const { unread, limit = 30 } = req.query;
  const filter = { recipient: req.user.id };
  if (unread === 'true') filter.readAt = null;

  const limitNum = Math.min(100, Math.max(1, Number(limit) || 30));
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name role')
      .sort('-createdAt')
      .limit(limitNum),
    Notification.countDocuments({ recipient: req.user.id, readAt: null }),
  ]);

  res.json({ items, unreadCount });
});

exports.markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { readAt: new Date() },
    { new: true }
  );
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: n });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, readAt: null },
    { readAt: new Date() }
  );
  res.json({ ok: true });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  const n = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ ok: true });
});
