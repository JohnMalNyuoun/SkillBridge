const mongoose = require('mongoose');

const organisationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCodeHash: String,
  emailVerificationCodeExpires: Date,
  emailVerificationAttempts: {
    type: Number,
    default: 0
  },
  passwordResetCodeHash: String,
  passwordResetCodeExpires: Date,
  passwordResetAttempts: {
    type: Number,
    default: 0
  },
  passwordChangeCodeHash: String,
  passwordChangeCodeExpires: Date,
  passwordChangeAttempts: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['NGO', 'CBO', 'UN_Agency', 'educational_institution', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Kakuma'
  },
  phoneNumber: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  documents: [{
    name: { type: String },
    url: { type: String }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  suspensionReason: {
    type: String
  },
  suspendedAt: {
    type: Date
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reinstatement: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'denied'],
      default: 'none'
    },
    requestMessage: { type: String },
    requestedAt: { type: Date },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: { type: Date },
    reviewNote: { type: String }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'organisation'
  },
  logo: {
    type: String,
    default: null
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    enum: ['en', 'sw', 'fr', 'ar'],
    default: 'en'
  }
}, { timestamps: true });

module.exports = mongoose.model('Organisation', organisationSchema);