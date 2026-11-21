const Follow = require('../models/Follow');

/**
 * Returns the set of user IDs (as strings) that `viewerId` follows.
 * Returns null when viewerId is falsy (anonymous viewer).
 */
async function getFollowingIds(viewerId) {
  if (!viewerId) return null;
  const rows = await Follow.find({ followerId: viewerId }).select('targetId').lean();
  return new Set(rows.map((r) => String(r.targetId)));
}

/**
 * Build a Mongo filter clause that hides `followers`-visibility documents
 * the viewer is not entitled to see.
 *
 *   ownerField: the schema field that points to the post owner (e.g. 'author', 'postedBy')
 *   viewerId:   the viewing user's id (string|ObjectId|null)
 *   isAdmin:    when true, no visibility restriction is applied
 */
async function buildVisibilityFilter({ ownerField, viewerId, isAdmin }) {
  if (isAdmin) return {}; // admins see everything

  if (!viewerId) {
    // Anonymous viewers only see public posts
    return { visibility: 'public' };
  }

  const following = await getFollowingIds(viewerId);
  const allowedOwners = [viewerId, ...Array.from(following)];

  return {
    $or: [
      { visibility: 'public' },
      { visibility: 'followers', [ownerField]: { $in: allowedOwners } },
    ],
  };
}

module.exports = { getFollowingIds, buildVisibilityFilter };
