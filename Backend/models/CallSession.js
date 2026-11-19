const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['ongoing', 'ended'],
    default: 'ongoing',
    required: true
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'startedByModel',
    required: true
  },
  startedByModel: {
    type: String,
    enum: ['User', 'Organisation'],
    required: true
  },
  declinedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  endedAt: {
    type: Date
  }
}, { timestamps: true });

callSessionSchema.index(
  { courseId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ongoing' }
  }
);

module.exports = mongoose.model('CallSession', callSessionSchema);
