const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Ownership
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },

  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
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
    ],
    required: true
  },

  // Targeting
  targetAudience: {
    type: String,
    enum: ['refugee', 'host_community', 'both'],
    required: true
  },
  ageMin: { type: Number },
  ageMax: { type: Number },
  gender: {
    type: String,
    enum: ['male', 'female', 'both'],
    default: 'both'
  },

  // Logistics
  location: {
    type: String,
    required: true
  },
  deliveryMode: {
    type: String,
    enum: ['in_person', 'online', 'hybrid'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  applicationDeadline: { type: Date, required: true },

  // Capacity
  totalSlots: { type: Number, required: true },
  filledSlots: { type: Number, default: 0 },

  // Application Questions
  applicationQuestions: [
    {
      question: { type: String, required: true },
      fieldType: {
        type: String,
        enum: ['text', 'textarea', 'select', 'yes_no', 'number', 'date'],
        default: 'textarea'
      },
      options: [String],
      isRequired: { type: Boolean, default: true }
    }
  ],

  googleFormLink: {
    type: String,
    default: null
  },

  // Media
  coverImage: { type: String },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'cancelled'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  outcomeQuestions: [
  {
    question: { type: String, required: true },
    fieldType: {
      type: String,
      enum: ['text', 'textarea', 'select', 'yes_no', 'number', 'date'],
      default: 'textarea'
    },
    options: [String],
    isRequired: { type: Boolean, default: true }
  }
],
outcomeQuestionsAdded: {
  type: Boolean,
  default: false
}

}, { timestamps: true });

// Virtuals
courseSchema.virtual('availableSlots').get(function () {
  return this.totalSlots - this.filledSlots;
});

courseSchema.virtual('isFull').get(function () {
  return this.filledSlots >= this.totalSlots;
});

module.exports = mongoose.model('Course', courseSchema);