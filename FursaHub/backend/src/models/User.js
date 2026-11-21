const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
    organization: { type: String, trim: true },

    profile: {
      phone: String,
      bio: String,
      skills: [String],
      avatar: String,
      graduationDate: Date,
      program: String,
      location: String,
    },

    // === Facebook-style profile fields (UserProfileView) ===
    profileBio: { type: String, maxLength: 250, default: '' },
    profilePictureUrl: { type: String, default: null }, // pre-compressed via media uploader
    coverBannerUrl: { type: String, default: null },    // pre-compressed via media uploader

    // Student portfolio (role: student)
    skillsTags: [{ type: String }],
    completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

    // Organization page (role: admin)
    physicalLocation: { type: String, default: 'Kakuma, Turkana County, Kenya' },
    websiteUrl: { type: String, default: '' },

    settings: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'high-contrast-data-saver'],
        default: 'light',
      },
      dataManagement: {
        lowDataMode: { type: Boolean, default: true },
        offlineSync: { type: Boolean, default: false },
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ['Public', 'Anonymized', 'Hidden'],
          default: 'Anonymized',
        },
        allowMentorshipRequests: { type: Boolean, default: false },
      },
      notifications: {
        inAppAlerts: { type: Boolean, default: true },
        smsFallback: { type: Boolean, default: true },
      },
    },

    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
