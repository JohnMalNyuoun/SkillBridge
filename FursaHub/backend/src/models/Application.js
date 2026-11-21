const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },

    status: {
      type: String,
      enum: ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
      default: 'submitted',
      index: true,
    },
    coverLetter: String,
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],

    submittedAt: { type: Date, default: Date.now },
    decisionAt: Date,
    decisionNotes: String,

    outcome: {
      placed: { type: Boolean, default: false },
      placementDate: Date,
      employer: String,
      role: String,
    },
  },
  { timestamps: true }
);

applicationSchema.index({ student: 1, opportunity: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
