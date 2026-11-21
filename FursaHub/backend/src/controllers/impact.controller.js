const asyncHandler = require('express-async-handler');
const ImpactRecord = require('../models/ImpactRecord');

exports.create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    student: req.body.student || req.user.id,
    submittedByStudent: req.user.role === 'student',
  };
  const record = await ImpactRecord.create(payload);
  res.status(201).json({ record });
});

exports.listForStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user.id;
  if (req.user.role !== 'admin' && req.user.id !== studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const items = await ImpactRecord.find({ student: studentId }).sort('checkpointDate');
  res.json({ items });
});

exports.list = asyncHandler(async (req, res) => {
  const { checkpoint, from, to, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (checkpoint) filter.checkpoint = checkpoint;
  if (from || to) {
    filter.checkpointDate = {};
    if (from) filter.checkpointDate.$gte = new Date(from);
    if (to) filter.checkpointDate.$lte = new Date(to);
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ImpactRecord.find(filter).populate('student', 'name email').skip(skip).limit(Number(limit)),
    ImpactRecord.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

exports.verify = asyncHandler(async (req, res) => {
  const record = await ImpactRecord.findByIdAndUpdate(
    req.params.id,
    { verifiedBy: req.user.id, verifiedAt: new Date() },
    { new: true }
  );
  if (!record) return res.status(404).json({ message: 'Record not found' });
  res.json({ record });
});

exports.summary = asyncHandler(async (_req, res) => {
  const agg = await ImpactRecord.aggregate([
    {
      $group: {
        _id: { checkpoint: '$checkpoint', status: '$employmentStatus' },
        count: { $sum: 1 },
        avgIncome: { $avg: '$monthlyIncome' },
      },
    },
    { $sort: { '_id.checkpoint': 1 } },
  ]);
  res.json({ summary: agg });
});
