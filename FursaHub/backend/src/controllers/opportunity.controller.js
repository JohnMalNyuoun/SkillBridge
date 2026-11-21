const asyncHandler = require('express-async-handler');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { notify } = require('../services/notification.service');
const { buildVisibilityFilter } = require('../services/visibility.service');

exports.list = asyncHandler(async (req, res) => {
  const { type, q, status = 'published', page = 1, limit = 20 } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q };

  const vis = await buildVisibilityFilter({
    ownerField: 'postedBy',
    viewerId: req.user?.id,
    isAdmin: req.user?.role === 'admin',
  });
  Object.assign(filter, vis);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Opportunity.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
    Opportunity.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.getById = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewsCount: 1 } },
    { new: true }
  );
  if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

  if (opp.visibility === 'followers' && req.user?.role !== 'admin') {
    const viewerId = req.user?.id;
    const isOwner = viewerId && String(opp.postedBy) === String(viewerId);
    if (!isOwner) {
      if (!viewerId) {
        return res.status(403).json({ message: 'This opportunity is visible to followers only' });
      }
      const follows = await Follow.exists({ followerId: viewerId, targetId: opp.postedBy });
      if (!follows) {
        return res.status(403).json({ message: 'This opportunity is visible to followers only' });
      }
    }
  }

  res.json({ opportunity: opp });
});

exports.create = asyncHandler(async (req, res) => {
  const { visibility } = req.body || {};
  if (!visibility || !['public', 'followers'].includes(visibility)) {
    return res.status(400).json({ message: 'Please select a visibility: Public or Followers Only' });
  }
  const opp = await Opportunity.create({ ...req.body, postedBy: req.user.id });

  if (opp.status === 'published') {
    // Only notify followers when this is a followers-only post; otherwise broadcast to all students.
    let recipients;
    if (opp.visibility === 'followers') {
      const follows = await Follow.find({ targetId: req.user.id }).select('followerId').lean();
      recipients = follows.map((f) => ({ _id: f.followerId }));
    } else {
      recipients = await User.find({ role: 'student', isActive: true }).select('_id').lean();
    }
    const message = `New opportunity: ${opp.title} (${opp.organization})`;
    await Promise.all(
      recipients.map((s) =>
        notify({
          recipient: s._id,
          actor: req.user.id,
          type: 'opportunity_published',
          message,
          link: '/explore',
          entity: { kind: 'Opportunity', id: opp._id },
        })
      )
    );
  }

  res.status(201).json({ opportunity: opp });
});

exports.update = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (update.visibility !== undefined && !['public', 'followers'].includes(update.visibility)) {
    return res.status(400).json({ message: 'Invalid visibility' });
  }
  const opp = await Opportunity.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
  res.json({ opportunity: opp });
});

exports.remove = asyncHandler(async (req, res) => {
  const opp = await Opportunity.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
  if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
  res.json({ opportunity: opp });
});
