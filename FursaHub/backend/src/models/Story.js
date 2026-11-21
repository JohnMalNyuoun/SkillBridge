const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    mediaUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },

    comments: [commentSchema],
    commentsCount: { type: Number, default: 0 },

    visibility: {
      type: String,
      enum: ['public', 'followers'],
      default: 'public',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['published', 'hidden', 'removed'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true }
);

storySchema.index({ title: 'text', body: 'text', tags: 'text' });
storySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
