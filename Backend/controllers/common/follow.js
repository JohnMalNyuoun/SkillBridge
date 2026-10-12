const Follow = require('../../models/Follow');
const User = require('../../models/Users');
const Organisation = require('../../models/Organisation');
const { success, error } = require('../../utils/apiResponse');
const { notify } = require('../../services/notificationService');

// @desc    Follow a user or organisation
// @route   POST /api/follow/:targetId/:targetModel
// @access  Authenticated
const followTarget = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;
    const followerId = req.user.id;
    const followerUser = await User.findById(followerId).select('fullName username');

    // Validate targetModel
    if (!['User', 'Organisation', 'Admin'].includes(targetModel)) {
      return error(res, 400, 'Invalid target model');
    }

    // Prevent self-following
    if (targetId === followerId && targetModel === 'User') {
      return error(res, 400, 'You cannot follow yourself');
    }

    // Check if target exists
    let target;
    if (targetModel === 'User' || targetModel === 'Admin') {
      target = await User.findById(targetId);
    } else if (targetModel === 'Organisation') {
      target = await Organisation.findById(targetId);
    }

    if (!target) {
      return error(res, 404, `${targetModel} not found`);
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: targetId,
      followingModel: targetModel
    });

    if (existingFollow) {
      return error(res, 400, 'You are already following this');
    }

    // Create follow
    const follow = await Follow.create({
      follower: followerId,
      following: targetId,
      followingModel: targetModel
    });

    if (targetModel === 'User' && target.notificationsEnabled !== false) {
      const followerName = followerUser?.fullName || followerUser?.username || 'Someone';
      await notify({
        recipient: targetId,
        recipientModel: 'User',
        title: 'New follower',
        message: `${followerName} started following you`,
        type: 'new_follower',
        reference: followerId,
        referenceModel: 'User',
        sender: followerId,
        senderModel: 'User'
      });
    }

    return success(res, 201, 'Following successfully', { followId: follow._id });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Unfollow a user or organisation
// @route   DELETE /api/follow/:targetId/:targetModel
// @access  Authenticated
const unfollowTarget = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;
    const followerId = req.user.id;

    // Validate targetModel
    if (!['User', 'Organisation', 'Admin'].includes(targetModel)) {
      return error(res, 400, 'Invalid target model');
    }

    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: targetId,
      followingModel: targetModel
    });

    if (!follow) {
      return error(res, 404, 'Follow relationship not found');
    }

    return success(res, 200, 'Unfollowed successfully');
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Check if current user follows a target
// @route   GET /api/follow/status/:targetId/:targetModel
// @access  Authenticated
const checkFollowStatus = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;
    const followerId = req.user.id;

    const follow = await Follow.findOne({
      follower: followerId,
      following: targetId,
      followingModel: targetModel
    });

    return success(res, 200, 'Status fetched', {
      isFollowing: !!follow,
      followId: follow?._id || null
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get follower count
// @route   GET /api/follow/count/:targetId/:targetModel
// @access  Public
const getFollowCount = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;

    const count = await Follow.countDocuments({
      following: targetId,
      followingModel: targetModel
    });

    return success(res, 200, 'Count fetched', { count });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get followers list
// @route   GET /api/follow/followers/:targetId/:targetModel
// @access  Public
const getFollowers = async (req, res) => {
  try {
    const { targetId, targetModel } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const followers = await Follow.find({
      following: targetId,
      followingModel: targetModel
    })
      .populate('follower', 'fullName username photo')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Follow.countDocuments({
      following: targetId,
      followingModel: targetModel
    });

    return success(res, 200, 'Followers fetched', {
      followers: followers.map(f => f.follower),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get following list
// @route   GET /api/follow/following/:userId
// @access  Public
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const following = await Follow.find({ follower: userId })
      .populate('following', 'fullName username photo name logo type')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Follow.countDocuments({ follower: userId });

    return success(res, 200, 'Following fetched', {
      following,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  followTarget,
  unfollowTarget,
  checkFollowStatus,
  getFollowCount,
  getFollowers,
  getFollowing
};
