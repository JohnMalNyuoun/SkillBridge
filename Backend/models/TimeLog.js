const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: null
  },
  userType: {
    type: String,
    enum: ['youth', 'organisation', 'admin'],
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  activityCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Calculate duration before saving
timeLogSchema.pre('save', function(next) {
  if (this.loginTime && this.logoutTime) {
    const diffMs = this.logoutTime - this.loginTime;
    this.duration = Math.ceil(diffMs / 60000); // convert ms to minutes
  }
  next();
});

// Index for efficient querying
timeLogSchema.index({ userId: 1, loginTime: -1 });
timeLogSchema.index({ email: 1, loginTime: -1 });
timeLogSchema.index({ loginTime: -1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);
