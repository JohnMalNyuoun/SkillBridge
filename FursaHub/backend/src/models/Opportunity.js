const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['internship', 'scholarship', 'job', 'training', 'mentorship', 'other'],
      required: true,
      index: true,
    },
    organization: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    remote: { type: Boolean, default: false },

    skillsRequired: [String],
    tags: [{ type: String, index: true }],

    applicationUrl: String,
    contactEmail: String,

    deadline: { type: Date, index: true },
    startDate: Date,

    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft', index: true },

    visibility: {
      type: String,
      enum: ['public', 'followers'],
      default: 'public',
      required: true,
      index: true,
    },

    viewsCount: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

opportunitySchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Opportunity', opportunitySchema);
