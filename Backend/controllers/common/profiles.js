const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const Follow = require('../../models/Follow');
const Application = require('../../models/Application');
const { success, error } = require('../../utils/apiResponse');

// @desc    Get public youth profile
// @route   GET /api/profiles/youth/:id
// @access  Authenticated
const getPublicYouthProfile = async (req, res) => {
  try {
    const youth = await User.findOne({
      _id: req.params.id,
      role: 'youth'
    }).select('fullName username bio photo communityType dateOfBirth gender language email phoneNumber visibilitySettings createdAt');

    if (!youth) {
      return error(res, 404, 'Youth profile not found');
    }

    const viewerId = req.user?.id;
    const targetId = String(youth._id);
    let isMutual = false;

    if (viewerId && String(viewerId) !== targetId) {
      const [viewerFollowsTarget, targetFollowsViewer] = await Promise.all([
        Follow.exists({ follower: viewerId, following: targetId, followingModel: 'User' }),
        Follow.exists({ follower: targetId, following: viewerId, followingModel: 'User' })
      ]);
      isMutual = !!viewerFollowsTarget && !!targetFollowsViewer;
    }

    const profile = youth.toObject();
    const visibility = profile.visibilitySettings || {};
    const canSee = (field) => {
      const rule = visibility[field] || 'private';
      return rule === 'public' || (rule === 'mutual' && isMutual);
    };

    if (!canSee('dateOfBirth')) profile.dateOfBirth = undefined;
    if (!canSee('email')) profile.email = undefined;
    if (!canSee('phoneNumber')) profile.phoneNumber = undefined;

    const attendanceRecords = await Application.find({
      youth: youth._id,
      $or: [
        { status: 'accepted' },
        { completionStatus: { $in: ['enrolled', 'completed'] } }
      ]
    })
      .populate('course', 'title description')
      .sort({ updatedAt: -1 });

    const seenCourseIds = new Set();
    profile.attendedCourses = attendanceRecords
      .filter((record) => {
        const courseId = record.course?._id ? String(record.course._id) : null;
        if (!courseId || seenCourseIds.has(courseId)) return false;
        seenCourseIds.add(courseId);
        return true;
      })
      .map((record) => ({
        _id: record.course._id,
        title: record.course.title,
        description: record.course.description || '',
        status: record.completionStatus || record.status
      }));

    return success(res, 200, 'Youth profile fetched', profile);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get public organisation profile
// @route   GET /api/profiles/organisation/:id
// @access  Authenticated
const getPublicOrganisationProfile = async (req, res) => {
  try {
    const organisation = await Organisation.findById(req.params.id)
      .select('name type description location website logo email phoneNumber status createdAt');

    if (!organisation) {
      return error(res, 404, 'Organisation profile not found');
    }

    return success(res, 200, 'Organisation profile fetched', organisation);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getPublicYouthProfile,
  getPublicOrganisationProfile
};
