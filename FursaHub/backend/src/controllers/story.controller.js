const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Story = require('../models/Story');
const { notify } = require('../services/notification.service');
const { buildVisibilityFilter } = require('../services/visibility.service');

function sanitizeTags(input) {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : String(input).split(',');
  return raw
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

function serializeComment(c) {
  const obj = c.toObject ? c.toObject() : c;
  return {
    _id: obj._id,
    body: obj.body,
    author: obj.author && obj.author._id
      ? { _id: obj.author._id, name: obj.author.name, role: obj.author.role }
      : { _id: obj.author },
    createdAt: obj.createdAt,
  };
}

function serialize(story, userId) {
  const obj = story.toObject ? story.toObject() : story;
  const likes = Array.isArray(obj.likes) ? obj.likes : [];
  const comments = Array.isArray(obj.comments) ? obj.comments : [];
  return {
    _id: obj._id,
    title: obj.title,
    body: obj.body,
    mediaUrl: obj.mediaUrl || null,
    tags: obj.tags || [],
    likesCount: obj.likesCount ?? likes.length,
    likedByMe: userId ? likes.some((id) => String(id) === String(userId)) : false,
    commentsCount: obj.commentsCount ?? comments.length,
    comments: comments.map(serializeComment),
    status: obj.status,
    visibility: obj.visibility || 'public',
    author: obj.author && obj.author._id
      ? { _id: obj.author._id, name: obj.author.name, role: obj.author.role }
      : { _id: obj.author },
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const { q, tag, author, page = 1, limit = 20 } = req.query;
  const filter = { status: 'published' };
  if (tag) filter.tags = String(tag).toLowerCase();
  if (author && mongoose.isValidObjectId(author)) filter.author = author;
  if (q) filter.$text = { $search: String(q) };

  const vis = await buildVisibilityFilter({
    ownerField: 'author',
    viewerId: req.user?.id,
    isAdmin: req.user?.role === 'admin',
  });
  Object.assign(filter, vis);

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Story.find(filter)
      .populate('author', 'name role')
      .populate('comments.author', 'name role')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum),
    Story.countDocuments(filter),
  ]);

  res.json({
    items: items.map((s) => serialize(s, req.user?.id)),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const story = await Story.findById(req.params.id)
    .populate('author', 'name role')
    .populate('comments.author', 'name role');
  if (!story || story.status === 'removed') {
    return res.status(404).json({ message: 'Story not found' });
  }
  if (story.visibility === 'followers' && req.user?.role !== 'admin') {
    const viewerId = req.user?.id;
    const isOwner = viewerId && String(story.author?._id || story.author) === String(viewerId);
    if (!isOwner) {
      if (!viewerId) {
        return res.status(403).json({ message: 'This post is visible to followers only' });
      }
      const Follow = require('../models/Follow');
      const follows = await Follow.exists({
        followerId: viewerId,
        targetId: story.author?._id || story.author,
      });
      if (!follows) {
        return res.status(403).json({ message: 'This post is visible to followers only' });
      }
    }
  }
  res.json({ story: serialize(story, req.user?.id) });
});

exports.listMine = asyncHandler(async (req, res) => {
  const items = await Story.find({ author: req.user.id })
    .populate('author', 'name role')
    .sort('-createdAt');
  res.json({ items: items.map((s) => serialize(s, req.user.id)) });
});

exports.create = asyncHandler(async (req, res) => {
  const { title, body, mediaUrl, tags, visibility } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!body || !String(body).trim()) {
    return res.status(400).json({ message: 'Story body is required' });
  }
  if (!visibility || !['public', 'followers'].includes(visibility)) {
    return res.status(400).json({ message: 'Please select a visibility: Public or Followers Only' });
  }

  const story = await Story.create({
    author: req.user.id,
    title: String(title).trim(),
    body: String(body).trim(),
    mediaUrl: mediaUrl ? String(mediaUrl).trim() : undefined,
    tags: sanitizeTags(tags),
    visibility,
  });

  const populated = await story.populate('author', 'name role');
  res.status(201).json({ story: serialize(populated, req.user.id) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const story = await Story.findById(req.params.id);
  if (!story || story.status === 'removed') {
    return res.status(404).json({ message: 'Story not found' });
  }
  const isOwner = String(story.author) === String(req.user.id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { title, body, mediaUrl, tags, status, visibility } = req.body || {};
  if (title !== undefined) story.title = String(title).trim();
  if (body !== undefined) story.body = String(body).trim();
  if (mediaUrl !== undefined) story.mediaUrl = mediaUrl ? String(mediaUrl).trim() : undefined;
  if (tags !== undefined) story.tags = sanitizeTags(tags);
  if (visibility !== undefined) {
    if (!['public', 'followers'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility' });
    }
    story.visibility = visibility;
  }
  if (status !== undefined && req.user.role === 'admin') story.status = status;

  await story.save();
  const populated = await story.populate('author', 'name role');
  res.json({ story: serialize(populated, req.user.id) });
});

exports.replace = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const story = await Story.findById(req.params.id);
  if (!story || story.status === 'removed') {
    return res.status(404).json({ message: 'Story not found' });
  }
  const isOwner = String(story.author) === String(req.user.id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { title, body, mediaUrl, tags, status, visibility } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (!body || !String(body).trim()) {
    return res.status(400).json({ message: 'Story body is required' });
  }
  if (!visibility || !['public', 'followers'].includes(visibility)) {
    return res.status(400).json({ message: 'Please select a visibility: Public or Followers Only' });
  }

  story.title = String(title).trim();
  story.body = String(body).trim();
  story.mediaUrl = mediaUrl ? String(mediaUrl).trim() : undefined;
  story.tags = sanitizeTags(tags);
  story.visibility = visibility;
  if (req.user.role === 'admin' && status) story.status = status;

  await story.save();
  const populated = await story.populate('author', 'name role');
  res.json({ story: serialize(populated, req.user.id) });
});

exports.headList = asyncHandler(async (req, res) => {
  const { tag, author, q } = req.query;
  const filter = { status: 'published' };
  if (tag) filter.tags = String(tag).toLowerCase();
  if (author && mongoose.isValidObjectId(author)) filter.author = author;
  if (q) filter.$text = { $search: String(q) };

  const total = await Story.countDocuments(filter);
  res.set('X-Total-Count', String(total));
  res.set('Access-Control-Expose-Headers', 'X-Total-Count');
  res.status(200).end();
});

exports.headOne = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
  const story = await Story.findById(req.params.id).select('likesCount status updatedAt');
  if (!story || story.status === 'removed') return res.status(404).end();
  res.set('X-Likes-Count', String(story.likesCount || 0));
  res.set('X-Status', story.status);
  res.set('Last-Modified', new Date(story.updatedAt).toUTCString());
  res.set('Access-Control-Expose-Headers', 'X-Likes-Count, X-Status, Last-Modified');
  res.status(200).end();
});

exports.remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ message: 'Story not found' });

  const isOwner = String(story.author) === String(req.user.id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  story.status = 'removed';
  await story.save();
  res.json({ ok: true });
});

exports.toggleLike = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const story = await Story.findById(req.params.id);
  if (!story || story.status !== 'published') {
    return res.status(404).json({ message: 'Story not found' });
  }

  const userId = req.user.id;
  const idx = story.likes.findIndex((id) => String(id) === String(userId));
  const wasLiked = idx >= 0;
  if (wasLiked) {
    story.likes.splice(idx, 1);
  } else {
    story.likes.push(userId);
  }
  story.likesCount = story.likes.length;
  await story.save();

  if (!wasLiked) {
    notify({
      recipient: story.author,
      actor: userId,
      type: 'story_like',
      message: `${req.user.name || 'Someone'} liked your story "${story.title}"`,
      link: `/inspire`,
      entity: { kind: 'Story', id: story._id },
    });
  }

  res.json({
    likedByMe: !wasLiked,
    likesCount: story.likesCount,
  });
});

exports.addComment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Story not found' });
  }
  const { body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ message: 'Comment body is required' });
  }

  const story = await Story.findById(req.params.id);
  if (!story || story.status !== 'published') {
    return res.status(404).json({ message: 'Story not found' });
  }

  story.comments.push({ author: req.user.id, body: String(body).trim() });
  story.commentsCount = story.comments.length;
  await story.save();

  await story.populate('comments.author', 'name role');
  const created = story.comments[story.comments.length - 1];

  notify({
    recipient: story.author,
    actor: req.user.id,
    type: 'story_comment',
    message: `${req.user.name || 'Someone'} commented on your story "${story.title}"`,
    link: `/inspire`,
    entity: { kind: 'Story', id: story._id },
  });

  res.status(201).json({
    comment: serializeComment(created),
    commentsCount: story.commentsCount,
  });
});

exports.removeComment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.commentId)) {
    return res.status(404).json({ message: 'Not found' });
  }
  const story = await Story.findById(req.params.id);
  if (!story) return res.status(404).json({ message: 'Story not found' });

  const comment = story.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  const isCommentOwner = String(comment.author) === String(req.user.id);
  const isStoryOwner = String(story.author) === String(req.user.id);
  if (!isCommentOwner && !isStoryOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  comment.deleteOne();
  story.commentsCount = story.comments.length;
  await story.save();

  res.json({ ok: true, commentsCount: story.commentsCount });
});
