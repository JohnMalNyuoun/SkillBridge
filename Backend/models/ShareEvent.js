const mongoose = require('mongoose');

const shareEventSchema = new mongoose.Schema({
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sharedByModel',
    default: null
  },
  sharedByModel: {
    type: String,
    enum: ['User', 'Organisation'],
    default: null
  },
  entityType: {
    type: String,
    enum: ['course', 'organisation', 'youth', 'broadcast', 'page', 'other'],
    default: 'other'
  },
  entityId: {
    type: String,
    default: null
  },
  target: {
    type: String,
    default: 'unknown'
  },
  url: {
    type: String,
    default: null
  }
}, { timestamps: true });

shareEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShareEvent', shareEventSchema);
