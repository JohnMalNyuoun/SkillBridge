const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  accountModel: {
    type: String,
    enum: ['User', 'Organisation'],
    required: true
  },
  refreshSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  platform: {
    type: String,
    enum: ['android'],
    default: 'android',
    required: true
  },
  lastSeenAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

pushTokenSchema.index({ accountId: 1, accountModel: 1, refreshSessionId: 1 });

module.exports = mongoose.model('PushToken', pushTokenSchema);
