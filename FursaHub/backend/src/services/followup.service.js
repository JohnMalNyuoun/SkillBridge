const cron = require('node-cron');
const User = require('../models/User');
const ImpactRecord = require('../models/ImpactRecord');

const CHECKPOINTS = [
  { key: '3_months', months: 3 },
  { key: '6_months', months: 6 },
  { key: '12_months', months: 12 },
];

function monthsAgo(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

async function generateDueFollowUps(now = new Date()) {
  const created = [];
  for (const cp of CHECKPOINTS) {
    const cutoff = monthsAgo(now, cp.months);
    const students = await User.find({
      role: 'student',
      isActive: true,
      'profile.graduationDate': { $lte: cutoff },
    }).select('_id profile.graduationDate');

    for (const s of students) {
      const exists = await ImpactRecord.findOne({ student: s._id, checkpoint: cp.key });
      if (exists) continue;
      const record = await ImpactRecord.create({
        student: s._id,
        checkpoint: cp.key,
        checkpointDate: now,
        followUp: { promptSentAt: now, reminderCount: 0 },
      });
      created.push(record._id);
    }
  }
  return created;
}

function startFollowUpJobs() {
  if (process.env.NODE_ENV === 'test') return;
  cron.schedule('0 2 * * *', async () => {
    try {
      const created = await generateDueFollowUps();
      if (created.length) console.log(`[fursahub] follow-up records created: ${created.length}`);
    } catch (err) {
      console.error('[fursahub] follow-up job failed:', err);
    }
  });
  console.log('[fursahub] follow-up cron scheduled (daily 02:00)');
}

module.exports = { startFollowUpJobs, generateDueFollowUps };
