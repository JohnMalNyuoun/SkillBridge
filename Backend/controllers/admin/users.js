const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const { communityType, isActive } = req.query;

    const filter = { role: 'youth' };
    if (communityType) filter.communityType = communityType;
    if (isActive) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return success(res, 200, 'Users fetched', users);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return error(res, 404, 'User not found');
    }

    return success(res, 200, 'User fetched', user);

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Deactivate user
// @route   PUT /api/admin/users/:id/deactivate
// @access  Admin
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return error(res, 404, 'User not found');
    }

    if (!user.isActive) {
      return error(res, 400, 'User is already deactivated');
    }

    user.isActive = false;
    await user.save();

    return success(res, 200, 'User deactivated', {
      id: user._id,
      fullName: user.fullName,
      isActive: user.isActive
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

// @desc    Reactivate user
// @route   PUT /api/admin/users/:id/reactivate
// @access  Admin
const reactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return error(res, 404, 'User not found');
    }

    if (user.isActive) {
      return error(res, 400, 'User is already active');
    }

    user.isActive = true;
    await user.save();

    return success(res, 200, 'User reactivated', {
      id: user._id,
      fullName: user.fullName,
      isActive: user.isActive
    });

  } catch (err) {
    return error(res, 500, err.message);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  deactivateUser,
  reactivateUser
};