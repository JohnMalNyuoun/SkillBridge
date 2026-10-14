const User = require('../../models/Users');
const { success, error } = require('../../utils/apiResponse');
const { deleteImage, uploadImage } = require('../../services/mongodbImageService');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return error(res, 404, 'User not found');
    return success(res, 200, 'Profile fetched', user);
  } catch (err) {
    return error(res, 500, err.message);
  }
};

const updatePhoto = async (req, res) => {
  let uploadedPhoto;
  try {
    if (!req.file) return error(res, 400, 'No photo uploaded');

    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    const previousPhoto = user.photo;
    uploadedPhoto = await uploadImage(req.file);
    user.photo = uploadedPhoto;

    try {
      await user.save();
    } catch (err) {
      await deleteImage(uploadedPhoto).catch((cleanupError) => {
        console.error('Failed to remove unreferenced admin profile image:', cleanupError.message);
      });
      throw err;
    }

    await deleteImage(previousPhoto).catch((err) => {
      console.error('Failed to remove replaced admin profile image:', err.message);
    });

    return success(res, 200, 'Profile photo updated', { photo: user.photo });
  } catch (err) {
    console.error('Admin profile photo upload error:', err.message);
    return error(res, err.statusCode || 500, err.message);
  }
};

const removePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return error(res, 404, 'User not found');

    const previousPhoto = user.photo;
    if (previousPhoto) {
      user.photo = null;
      await user.save();
      await deleteImage(previousPhoto).catch((err) => {
        console.error('Failed to remove deleted admin profile image:', err.message);
      });
    }

    return success(res, 200, 'Profile photo removed', { photo: null });
  } catch (err) {
    console.error('Admin profile photo removal error:', err.message);
    return error(res, 500, err.message);
  }
};

module.exports = { getProfile, removePhoto, updatePhoto };
