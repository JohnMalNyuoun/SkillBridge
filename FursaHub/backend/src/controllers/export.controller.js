const asyncHandler = require('express-async-handler');
const { exportImpactCsv, exportImpactPdf } = require('../services/export.service');

exports.impactCsv = asyncHandler(async (req, res) => {
  const csv = await exportImpactCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="impact-report.csv"');
  res.send(csv);
});

exports.impactPdf = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="impact-report.pdf"');
  await exportImpactPdf(req.query, res);
});
