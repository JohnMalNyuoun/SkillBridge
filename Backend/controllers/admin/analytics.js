const User = require('../../models/Users');
const Application = require('../../models/Application');
const ShareEvent = require('../../models/ShareEvent');
const Organisation = require('../../models/Organisation');
const { success, error } = require('../../utils/apiResponse');

const dayMs = 24 * 60 * 60 * 1000;

const trendOf = (current, previous) => {
  if (!previous) {
    if (!current) return { direction: 'steady', changePct: 0 };
    return { direction: 'up', changePct: 100 };
  }
  const diff = current - previous;
  const changePct = Math.round((diff / previous) * 100);
  if (changePct > 2) return { direction: 'up', changePct };
  if (changePct < -2) return { direction: 'down', changePct };
  return { direction: 'steady', changePct };
};

// @desc    Aggregated user activity metrics
// @route   GET /api/admin/analytics/users
// @access  Admin
const getUserAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const day1 = new Date(now.getTime() - dayMs);
    const day7 = new Date(now.getTime() - 7 * dayMs);
    const day14 = new Date(now.getTime() - 14 * dayMs);
    const day30 = new Date(now.getTime() - 30 * dayMs);

    const baseUserFilter = { role: 'youth' };

    const [
      totalUsers,
      usersNewLast7,
      usersNewPrev7,
      activeLast24h,
      activeLast7d,
      activeLast30d,
      neverLoggedIn,
      totalApplications,
      appsLast7,
      appsPrev7,
      totalShares,
      sharesLast7,
      sharesPrev7,
      sharesByTargetAgg
    ] = await Promise.all([
      User.countDocuments(baseUserFilter),
      User.countDocuments({ ...baseUserFilter, createdAt: { $gte: day7 } }),
      User.countDocuments({ ...baseUserFilter, createdAt: { $gte: day14, $lt: day7 } }),
      User.countDocuments({ ...baseUserFilter, lastLoginAt: { $gte: day1 } }),
      User.countDocuments({ ...baseUserFilter, lastLoginAt: { $gte: day7 } }),
      User.countDocuments({ ...baseUserFilter, lastLoginAt: { $gte: day30 } }),
      User.countDocuments({ ...baseUserFilter, $or: [{ lastLoginAt: null }, { lastLoginAt: { $exists: false } }] }),
      Application.countDocuments({}),
      Application.countDocuments({ createdAt: { $gte: day7 } }),
      Application.countDocuments({ createdAt: { $gte: day14, $lt: day7 } }),
      ShareEvent.countDocuments({}),
      ShareEvent.countDocuments({ createdAt: { $gte: day7 } }),
      ShareEvent.countDocuments({ createdAt: { $gte: day14, $lt: day7 } }),
      ShareEvent.aggregate([
        { $group: { _id: '$target', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ])
    ]);

    const sharesByTarget = sharesByTargetAgg.map((row) => ({
      target: row._id || 'unknown',
      count: row.count
    }));

    return success(res, 200, 'User analytics', {
      users: {
        total: totalUsers,
        newLast7d: usersNewLast7,
        newPrev7d: usersNewPrev7,
        trend: trendOf(usersNewLast7, usersNewPrev7)
      },
      logins: {
        last24h: activeLast24h,
        last7d: activeLast7d,
        last30d: activeLast30d,
        neverLoggedIn
      },
      applications: {
        total: totalApplications,
        last7d: appsLast7,
        prev7d: appsPrev7,
        trend: trendOf(appsLast7, appsPrev7)
      },
      shares: {
        total: totalShares,
        last7d: sharesLast7,
        prev7d: sharesPrev7,
        trend: trendOf(sharesLast7, sharesPrev7),
        byTarget: sharesByTarget
      },
      windowEndsAt: now.toISOString()
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Aggregated organisation moderation metrics
// @route   GET /api/admin/analytics/moderation
// @access  Admin
const getModerationAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const day7 = new Date(now.getTime() - 7 * dayMs);
    const day14 = new Date(now.getTime() - 14 * dayMs);

    const [
      totalOrgs,
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount,
      pendingReinstatementCount,
      approvedLast7,
      approvedPrev7,
      suspendedLast7,
      suspendedPrev7,
      recentApproved,
      recentSuspended,
      recentReinstated
    ] = await Promise.all([
      Organisation.countDocuments({}),
      Organisation.countDocuments({ status: 'pending' }),
      Organisation.countDocuments({ status: 'approved' }),
      Organisation.countDocuments({ status: 'rejected' }),
      Organisation.countDocuments({ status: 'suspended' }),
      Organisation.countDocuments({ status: 'suspended', 'reinstatement.status': 'pending' }),
      Organisation.countDocuments({ approvedAt: { $gte: day7 } }),
      Organisation.countDocuments({ approvedAt: { $gte: day14, $lt: day7 } }),
      Organisation.countDocuments({ suspendedAt: { $gte: day7 } }),
      Organisation.countDocuments({ suspendedAt: { $gte: day14, $lt: day7 } }),
      Organisation.find({ status: 'approved', approvedAt: { $ne: null } })
        .select('name approvedAt')
        .sort({ approvedAt: -1 })
        .limit(5)
        .lean(),
      Organisation.find({ status: 'suspended', suspendedAt: { $ne: null } })
        .select('name suspendedAt suspensionReason')
        .sort({ suspendedAt: -1 })
        .limit(5)
        .lean(),
      Organisation.find({ 'reinstatement.status': 'approved' })
        .select('name reinstatement.reviewedAt')
        .sort({ 'reinstatement.reviewedAt': -1 })
        .limit(5)
        .lean()
    ]);

    return success(res, 200, 'Moderation analytics', {
      orgs: {
        total: totalOrgs,
        byStatus: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          suspended: suspendedCount
        },
        pendingReinstatement: pendingReinstatementCount
      },
      approvals: {
        last7d: approvedLast7,
        prev7d: approvedPrev7,
        trend: trendOf(approvedLast7, approvedPrev7)
      },
      suspensions: {
        last7d: suspendedLast7,
        prev7d: suspendedPrev7,
        trend: trendOf(suspendedLast7, suspendedPrev7)
      },
      recent: {
        approved: recentApproved.map((o) => ({
          id: o._id, name: o.name, at: o.approvedAt
        })),
        suspended: recentSuspended.map((o) => ({
          id: o._id, name: o.name, at: o.suspendedAt, reason: o.suspensionReason
        })),
        reinstated: recentReinstated.map((o) => ({
          id: o._id, name: o.name, at: o.reinstatement?.reviewedAt
        }))
      },
      windowEndsAt: now.toISOString()
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = { getUserAnalytics, getModerationAnalytics };
