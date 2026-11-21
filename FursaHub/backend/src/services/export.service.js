const Papa = require('papaparse');
const PDFDocument = require('pdfkit');
const ImpactRecord = require('../models/ImpactRecord');

function buildFilter(query = {}) {
  const { checkpoint, from, to } = query;
  const filter = {};
  if (checkpoint) filter.checkpoint = checkpoint;
  if (from || to) {
    filter.checkpointDate = {};
    if (from) filter.checkpointDate.$gte = new Date(from);
    if (to) filter.checkpointDate.$lte = new Date(to);
  }
  return filter;
}

async function fetchRecords(query) {
  return ImpactRecord.find(buildFilter(query))
    .populate('student', 'name email profile.program profile.graduationDate')
    .lean();
}

async function exportImpactCsv(query) {
  const records = await fetchRecords(query);
  const rows = records.map((r) => ({
    student_name: r.student?.name,
    student_email: r.student?.email,
    program: r.student?.profile?.program,
    graduation_date: r.student?.profile?.graduationDate,
    checkpoint: r.checkpoint,
    checkpoint_date: r.checkpointDate,
    employment_status: r.employmentStatus,
    employer: r.employer,
    role: r.role,
    monthly_income: r.monthlyIncome,
    currency: r.currency,
    verified: Boolean(r.verifiedAt),
  }));
  return Papa.unparse(rows);
}

async function exportImpactPdf(query, writableStream) {
  const records = await fetchRecords(query);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(writableStream);

  doc.fontSize(20).text('Fursahub Impact Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown();

  const total = records.length;
  const employed = records.filter((r) => r.employmentStatus?.startsWith('employed') || r.employmentStatus === 'self_employed').length;
  doc.fillColor('#000').fontSize(12);
  doc.text(`Total records: ${total}`);
  doc.text(`Employed / self-employed: ${employed}`);
  doc.text(`Employment rate: ${total ? ((employed / total) * 100).toFixed(1) : 0}%`);
  doc.moveDown();

  records.forEach((r, i) => {
    doc.fontSize(11).fillColor('#000').text(`${i + 1}. ${r.student?.name || 'Unknown'} (${r.checkpoint})`);
    doc.fontSize(9).fillColor('#444')
      .text(`   Status: ${r.employmentStatus} | Employer: ${r.employer || '—'} | Role: ${r.role || '—'}`)
      .text(`   Checkpoint date: ${r.checkpointDate?.toISOString?.().slice(0, 10) || ''}`);
    doc.moveDown(0.3);
  });

  doc.end();
}

module.exports = { exportImpactCsv, exportImpactPdf };
