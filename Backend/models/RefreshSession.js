const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema({
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
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  tokenId: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  lastActivityAt: {
    type: Date,
    required: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  platform: {
    type: String,
    enum: ['android'],
    required: true
  },
  deviceName: {
    type: String,
    required: true,
    maxlength: 80
  }
}, { timestamps: true });

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);
