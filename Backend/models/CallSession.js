const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  groupChatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat'
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
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: 'video',
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
  invitedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
