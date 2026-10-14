// routes/broadcasts.js
const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { success, error } = require('../utils/apiResponse');

// @desc    Public feed of admin broadcasts
// @route   GET /api/broadcasts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const broadcasts = await Broadcast.find({ audience: 'all' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title message image audience createdAt createdBy')
      .populate('createdBy', 'fullName photo')
      .lean();
    const publicBroadcasts = broadcasts.map((broadcast) => ({
      ...broadcast,
      author: broadcast.createdBy
        ? {
            fullName: broadcast.createdBy.fullName,
            photo: broadcast.createdBy.photo || null
          }
        : null,
      createdBy: undefined
    }));
    return success(res, 200, 'Broadcasts fetched', publicBroadcasts);
  } catch (err) {
    return error(res, 500, err.message);
  }
});

module.exports = router;
