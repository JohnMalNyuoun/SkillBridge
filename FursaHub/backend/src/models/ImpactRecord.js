const mongoose = require('mongoose');

const impactRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },

    checkpoint: {
      type: String,
      enum: ['3_months', '6_months', '12_months', 'ad_hoc'],
      required: true,
      index: true,
    },
    checkpointDate: { type: Date, required: true, index: true },

    employmentStatus: {
      type: String,
      enum: ['employed_full_time', 'employed_part_time', 'self_employed', 'further_study', 'unemployed', 'unknown'],
      default: 'unknown',
    },
    employer: String,
    role: String,
    monthlyIncome: Number,
    currency: { type: String, default: 'KES' },

    skillsApplied: [String],
    storyHighlights: String,
    mediaAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],

    submittedByStudent: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,

    followUp: {
      promptSentAt: Date,
      reminderCount: { type: Number, default: 0 },
      respondedAt: Date,
    },
  },
  { timestamps: true }
);

impactRecordSchema.index({ student: 1, checkpoint: 1 }, { unique: false });

module.exports = mongoose.model('ImpactRecord', impactRecordSchema);
