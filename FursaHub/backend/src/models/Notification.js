const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['story_like', 'story_comment', 'opportunity_published', 'application_status', 'system'],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String },
    entity: {
      kind: { type: String, enum: ['Story', 'Opportunity', 'Application'] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
