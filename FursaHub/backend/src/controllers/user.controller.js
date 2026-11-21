const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Story = require('../models/Story');
const Opportunity = require('../models/Opportunity');
const Follow = require('../models/Follow');

exports.list = asyncHandler(async (req, res) => {
  const { role, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ message: 'Cannot edit another user' });
  }
  const updates = { ...req.body };
  delete updates.role;
  delete updates.passwordHash;
  delete updates.email;
  delete updates._id;

  // Coerce / sanitize new Facebook-style fields
  if (updates.profileBio !== undefined) {
    updates.profileBio = String(updates.profileBio || '').slice(0, 250);
  }
  if (updates.skillsTags !== undefined) {
    updates.skillsTags = Array.isArray(updates.skillsTags)
      ? updates.skillsTags
      : String(updates.skillsTags || '').split(',');
    updates.skillsTags = updates.skillsTags
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  if (updates.websiteUrl !== undefined) {
    updates.websiteUrl = String(updates.websiteUrl || '').trim();
  }
  if (updates.physicalLocation !== undefined) {
    updates.physicalLocation = String(updates.physicalLocation || '').trim();
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

exports.deactivate = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

/**
 * Public directory used by Explore's “Connect & Follow” panel.
 * Returns a list of organizations and active members with follower counts
 * and (when signed-in) whether the viewer already follows each one.
 */
exports.directory = asyncHandler(async (req, res) => {
  const orgLimit = Math.min(200, Math.max(1, Number(req.query.orgLimit) || 8));
  const memberLimit = Math.min(200, Math.max(1, Number(req.query.memberLimit) || 8));
  const viewerId = req.user?.id;

  const [orgs, members] = await Promise.all([
    User.find({ role: 'admin', isActive: true })
      .select('name organization physicalLocation profilePictureUrl profileBio skillsTags')
      .sort('-createdAt')
      .limit(orgLimit)
      .lean(),
    User.find({
      role: 'student',
      isActive: true,
      ...(viewerId ? { _id: { $ne: viewerId } } : {}),
    })
      .select('name organization profile profilePictureUrl profileBio skillsTags')
      .sort('-createdAt')
      .limit(memberLimit)
      .lean(),
  ]);

  const allIds = [...orgs, ...members].map((u) => u._id);
  const [followerCounts, viewerFollows] = await Promise.all([
    Follow.aggregate([
      { $match: { targetId: { $in: allIds } } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]),
    viewerId
      ? Follow.find({ followerId: viewerId, targetId: { $in: allIds } }).select('targetId').lean()
      : [],
  ]);
  const countMap = new Map(followerCounts.map((c) => [String(c._id), c.count]));
  const followSet = new Set((viewerFollows || []).map((f) => String(f.targetId)));

  function shape(u, kind) {
    return {
      _id: u._id,
      kind,
      name: u.name,
      organization: u.organization || null,
      location: u.physicalLocation || u.profile?.location || null,
      avatar: u.profilePictureUrl || u.profile?.avatar || null,
      bio: u.profileBio || u.profile?.bio || '',
      tags: (u.skillsTags && u.skillsTags.length ? u.skillsTags : u.profile?.skills) || [],
      followers: countMap.get(String(u._id)) || 0,
      following: followSet.has(String(u._id)),
    };
  }

  res.json({
    organizations: orgs.map((u) => shape(u, 'Organization')).sort((a, b) => b.followers - a.followers),
    members: members.map((u) => shape(u, 'User')).sort((a, b) => b.followers - a.followers),
  });
});

/**
 * Public profile view: identity card + counts + content tabs.
 * Respects visibility gates: only public stories/opportunities are returned
 * unless the viewer follows the profile owner (or is the owner / an admin).
 */
exports.getPublicProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: 'User not found' });
  }
  const user = await User.findById(id).select(
    'name email role organization profile profileBio profilePictureUrl coverBannerUrl skillsTags physicalLocation websiteUrl createdAt'
  );
  if (!user || !user.isActive === true) {
    /* isActive defaults true; if explicitly false leave it visible since it's controlled elsewhere */
  }
  if (!user) return res.status(404).json({ message: 'User not found' });

  const viewerId = req.user?.id;
  const isOwner = viewerId && String(viewerId) === String(user._id);
  const isAdmin = req.user?.role === 'admin';

  const [followers, following, iFollow] = await Promise.all([
    Follow.countDocuments({ targetId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
    viewerId ? Follow.exists({ followerId: viewerId, targetId: user._id }) : null,
  ]);

  // Visibility filter for the timeline tabs
  const canSeeFollowersOnly = isAdmin || isOwner || !!iFollow;
  const visClause = canSeeFollowersOnly
    ? {}
    : { visibility: 'public' };

  const stories = await Story.find({ author: user._id, status: 'published', ...visClause })
    .sort('-createdAt')
    .limit(20)
    .populate('author', 'name role')
    .lean();

  const opportunities = await Opportunity.find({ postedBy: user._id, status: 'published', ...visClause })
    .sort('-createdAt')
    .limit(20)
    .lean();

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      role: user.role,
      organization: user.organization || null,
      profileBio: user.profileBio || user.profile?.bio || '',
      profilePictureUrl: user.profilePictureUrl || user.profile?.avatar || null,
      coverBannerUrl: user.coverBannerUrl || null,
      skillsTags: user.skillsTags?.length ? user.skillsTags : user.profile?.skills || [],
      physicalLocation: user.physicalLocation || user.profile?.location || '',
      websiteUrl: user.websiteUrl || '',
      program: user.profile?.program || null,
      joinedAt: user.createdAt,
    },
    counts: {
      followers,
      following,
      stories: stories.length,
      opportunities: opportunities.length,
    },
    viewer: {
      isOwner,
      isAdmin,
      following: !!iFollow,
    },
    stories: stories.map((s) => ({
      _id: s._id,
      title: s.title,
      body: s.body,
      tags: s.tags || [],
      mediaUrl: s.mediaUrl || null,
      visibility: s.visibility || 'public',
      likesCount: s.likesCount || 0,
      commentsCount: s.commentsCount || 0,
      createdAt: s.createdAt,
    })),
    opportunities: opportunities.map((o) => ({
      _id: o._id,
      title: o.title,
      description: o.description,
      type: o.type,
      organization: o.organization,
      location: o.location,
      remote: o.remote,
      visibility: o.visibility || 'public',
      applicationUrl: o.applicationUrl,
      deadline: o.deadline,
      createdAt: o.createdAt,
    })),
  });
});

const THEMES = ['light', 'dark', 'high-contrast-data-saver'];
const VISIBILITY = ['Public', 'Anonymized', 'Hidden'];

function buildSettingsUpdate(input = {}) {
  const $set = {};
  if (input.theme !== undefined) {
    if (!THEMES.includes(input.theme)) throw Object.assign(new Error('Invalid theme'), { status: 400 });
    $set['settings.theme'] = input.theme;
  }
  if (input.dataManagement) {
    const { lowDataMode, offlineSync } = input.dataManagement;
    if (lowDataMode !== undefined) $set['settings.dataManagement.lowDataMode'] = !!lowDataMode;
    if (offlineSync !== undefined) $set['settings.dataManagement.offlineSync'] = !!offlineSync;
  }
  if (input.privacy) {
    const { profileVisibility, allowMentorshipRequests } = input.privacy;
    if (profileVisibility !== undefined) {
      if (!VISIBILITY.includes(profileVisibility)) {
        throw Object.assign(new Error('Invalid profileVisibility'), { status: 400 });
      }
      $set['settings.privacy.profileVisibility'] = profileVisibility;
    }
    if (allowMentorshipRequests !== undefined) {
      $set['settings.privacy.allowMentorshipRequests'] = !!allowMentorshipRequests;
    }
  }
  if (input.notifications) {
    const { inAppAlerts, smsFallback } = input.notifications;
    if (inAppAlerts !== undefined) $set['settings.notifications.inAppAlerts'] = !!inAppAlerts;
    if (smsFallback !== undefined) $set['settings.notifications.smsFallback'] = !!smsFallback;
  }
  return $set;
}

exports.getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('settings');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ settings: user.settings || {} });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  let $set;
  try {
    $set = buildSettingsUpdate(req.body || {});
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }
  if (Object.keys($set).length === 0) {
    return res.status(400).json({ message: 'No settings provided' });
  }
  const user = await User.findByIdAndUpdate(req.user.id, { $set }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ settings: user.settings });
});
