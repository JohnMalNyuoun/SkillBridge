const asyncHandler = require('express-async-handler');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

exports.apply = asyncHandler(async (req, res) => {
  const { opportunityId, coverLetter, attachments } = req.body;
  const opp = await Opportunity.findById(opportunityId);
  if (!opp || opp.status !== 'published') {
    return res.status(404).json({ message: 'Opportunity not available' });
  }

  try {
    const application = await Application.create({
      student: req.user.id,
      opportunity: opportunityId,
      coverLetter,
      attachments,
    });
    await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { applicationsCount: 1 } });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already applied' });
    throw err;
  }
});

exports.listMine = asyncHandler(async (req, res) => {
  const items = await Application.find({ student: req.user.id })
    .populate('opportunity')
    .sort('-createdAt');
  res.json({ items });
});

exports.listForOpportunity = asyncHandler(async (req, res) => {
  const items = await Application.find({ opportunity: req.params.opportunityId })
    .populate('student', 'name email profile')
    .sort('-createdAt');
  res.json({ items });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, decisionNotes, outcome } = req.body;
  const app = await Application.findByIdAndUpdate(
    req.params.id,
    {
      ...(status && { status, decisionAt: new Date() }),
      ...(decisionNotes && { decisionNotes }),
      ...(outcome && { outcome }),
    },
    { new: true, runValidators: true }
  );
  if (!app) return res.status(404).json({ message: 'Application not found' });
  res.json({ application: app });
});

exports.withdraw = asyncHandler(async (req, res) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, student: req.user.id },
    { status: 'withdrawn' },
    { new: true }
  );
  if (!app) return res.status(404).json({ message: 'Application not found' });
  res.json({ application: app });
});
