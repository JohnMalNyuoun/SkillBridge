// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Organisation']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_follower',
      'application_submitted',
      'application_shortlisted',
      'application_accepted',
      'application_rejected',
      'course_published',
      'org_approved',
      'org_rejected',
      'org_suspended',
      'org_reinstatement_request',
      'org_reinstated',
      'org_reinstatement_denied',
      'admin_broadcast'
    ],
    required: true
  },
  image: {
    type: String
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId
  },
  referenceModel: {
    type: String,
    enum: ['Course', 'Application', 'Organisation', 'User', 'Broadcast']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    enum: ['User', 'Organisation', 'Admin']
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);