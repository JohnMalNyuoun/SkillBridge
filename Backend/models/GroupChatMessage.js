const mongoose = require('mongoose');

const groupChatAttachmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const groupChatReactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'reactions.userModel',
    required: true
  },
  userModel: {
    type: String,
    enum: ['User', 'Organisation'],
    required: true
  },
  emoji: {
    type: String,
    required: true,
    enum: ['👍', '❤️', '😂', '😮', '😢', '👏']
  }
}, { _id: false });

const groupChatMessageSchema = new mongoose.Schema({
  groupChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required() {
      return !this.senderName;
    }
  },
  senderName: {
    type: String,
    trim: true,
    required() {
      return !this.sender;
    }
  },
  senderOrganisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation'
  },
  content: {
    type: String,
    trim: true,
    maxlength: 2000,
    validate: {
      validator(value) {
        return Boolean(value || this.attachment);
      },
      message: 'A message must contain text or an attachment.'
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChatMessage'
  },
  reactions: {
    type: [groupChatReactionSchema],
    default: []
  },
  attachment: {
    type: groupChatAttachmentSchema,
    default: undefined
  }
}, { timestamps: true });

groupChatMessageSchema.index({ groupChat: 1, createdAt: -1 });

module.exports = mongoose.model('GroupChatMessage', groupChatMessageSchema);
