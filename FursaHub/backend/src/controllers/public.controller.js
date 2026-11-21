const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Story = require('../models/Story');
const Subscriber = require('../models/Subscriber');
const ContactMessage = require('../models/ContactMessage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.getStats = asyncHandler(async (_req, res) => {
  const [students, opportunities, applications, stories] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    Opportunity.countDocuments({}),
    Application.countDocuments({}),
    Story.countDocuments({}),
  ]);
  res.json({ students, opportunities, applications, stories });
});

exports.subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  const source = String(req.body?.source || 'landing').slice(0, 60);
  await Subscriber.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, source }, $set: { unsubscribedAt: null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ ok: true });
});

exports.contact = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || name.length > 120) {
    return res.status(400).json({ message: 'Name is required (max 120 chars).' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (!message || message.length > 4000) {
    return res.status(400).json({ message: 'Message is required (max 4000 chars).' });
  }

  const doc = await ContactMessage.create({
    name,
    email,
    subject: subject || 'Support request',
    message,
  });
  res.status(201).json({ ok: true, id: doc._id });
});
