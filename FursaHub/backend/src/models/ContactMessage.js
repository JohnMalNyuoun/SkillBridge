const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    subject: { type: String, trim: true, maxlength: 200, default: 'Support request' },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
