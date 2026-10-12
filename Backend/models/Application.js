const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  youth: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  answers: [
    {
      question: { type: String },
      answer: { type: String }
    }
  ],
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'shortlisted',
      'accepted',
      'rejected',
      'withdrawn'
    ],
    default: 'submitted'
  },
  rejectionReason: {
    type: String
  },
  shortlistedAt: {
    type: Date
  },
  shortlistNote: {
    type: String
  },
  nextStep: {
    type: {
      type: String,
      enum: ['in_person', 'online']
    },
    location: { type: String },
    scheduledAt: { type: Date }
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation'
  },
  reviewedAt: {
    type: Date
  },
  timeline: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      message: { type: String }
    }
  ],
  // Completion tracking
completionStatus: {
  type: String,
  enum: ['enrolled', 'completed', 'dropped_out', 'not_attended'],
  default: null
},
completionMarkedAt: {
  type: Date
},
completionMarkedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organisation'
},

// Outcome form
outcomeAnswers: [
  {
    question: { type: String },
    answer: { type: String }
  }
],
outcomeSubmittedAt: {
  type: Date
},
outcomeSubmitted: {
  type: Boolean,
  default: false
}

}, { timestamps: true });

// One application per youth per course
applicationSchema.index(
  { youth: 1, course: 1 },
  { unique: true }
);

module.exports = mongoose.model('Application', applicationSchema);