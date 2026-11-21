const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Points to a User ID (an alumni/mentor) or an Organization Document ID (admin user representing the org).
    targetType: {
      type: String,
      enum: ['User', 'Organization'],
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user cannot duplicate a follow connection
FollowSchema.index({ followerId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Follow', FollowSchema);
