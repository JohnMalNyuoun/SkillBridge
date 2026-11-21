const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const User = require('../models/User');

function resolveTargetType(user) {
  return user.role === 'admin' ? 'Organization' : 'User';
}

exports.follow = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  if (!mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Invalid target id' });
  }
  if (String(targetId) === String(req.user.id)) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }
  const target = await User.findById(targetId).select('_id role name organization');
  if (!target) return res.status(404).json({ message: 'Target not found' });

  const doc = await Follow.findOneAndUpdate(
    { followerId: req.user.id, targetId: target._id },
    { $setOnInsert: { targetType: resolveTargetType(target) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ follow: doc, following: true });
});

exports.unfollow = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  if (!mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Invalid target id' });
  }
  await Follow.deleteOne({ followerId: req.user.id, targetId });
  res.json({ following: false });
});

exports.status = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  if (!mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Invalid target id' });
  }
  const exists = await Follow.exists({ followerId: req.user.id, targetId });
  res.json({ following: !!exists });
});

exports.listFollowing = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const rows = await Follow.find({ followerId: userId })
    .sort('-createdAt')
    .populate({ path: 'targetId', model: 'User', select: 'name role organization profile.avatar' });
  res.json({
    items: rows.map((r) => ({
      _id: r._id,
      targetType: r.targetType,
      target: r.targetId,
      createdAt: r.createdAt,
    })),
    total: rows.length,
  });
});

exports.listFollowers = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const rows = await Follow.find({ targetId: userId })
    .sort('-createdAt')
    .populate({ path: 'followerId', model: 'User', select: 'name role organization profile.avatar' });
  res.json({
    items: rows.map((r) => ({
      _id: r._id,
      follower: r.followerId,
      createdAt: r.createdAt,
    })),
    total: rows.length,
  });
});

exports.counts = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const [followers, following] = await Promise.all([
    Follow.countDocuments({ targetId: userId }),
    Follow.countDocuments({ followerId: userId }),
  ]);
  let following_me = false;
  let i_follow = false;
  if (req.user) {
    const [a, b] = await Promise.all([
      Follow.exists({ followerId: userId, targetId: req.user.id }),
      Follow.exists({ followerId: req.user.id, targetId: userId }),
    ]);
    following_me = !!a;
    i_follow = !!b;
  }
  res.json({ followers, following, i_follow, following_me });
});
