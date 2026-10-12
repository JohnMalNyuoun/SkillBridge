const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'followingModel',
    required: true
  },
  followingModel: {
    type: String,
    enum: ['User', 'Organisation', 'Admin'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique index to prevent duplicate follows
followSchema.index({ follower: 1, following: 1, followingModel: 1 }, { unique: true });

module.exports = mongoose.model('Follow', followSchema);
