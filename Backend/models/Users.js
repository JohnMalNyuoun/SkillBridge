const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  lastFullNameChangeAt: {
    type: Date
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  communityType: {
    type: String,
    enum: ['refugee', 'host_community'],
    required: true
  },
  age: {
    type: Number
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'prefer_not_to_say']
  },
  phoneNumber: {
    type: String
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
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['youth', 'admin'],
    default: 'youth'
  },
  photo: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  language: {
    type: String,
    enum: ['en', 'sw', 'fr', 'ar'],
    default: 'en'
  },
  visibilitySettings: {
    dateOfBirth: {
      type: String,
      enum: ['public', 'mutual', 'private'],
      default: 'public'
    },
    email: {
      type: String,
      enum: ['public', 'mutual', 'private'],
      default: 'public'
    },
    phoneNumber: {
      type: String,
      enum: ['public', 'mutual', 'private'],
      default: 'public'
    }
  },
  categoryPreferences: [{
    type: String,
    enum: [
      'technology',
      'business',
      'health',
      'education',
      'vocational',
      'language',
      'leadership',
      'other'
    ]
  }],
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  emailChangeToken: {
    type: String
  },
  emailChangeExpires: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);