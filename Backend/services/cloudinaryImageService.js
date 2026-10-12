const cloudinary = require('../config/cloudinary');

const IMAGE_FOLDER = 'fursahub';

const uploadImage = async (file, transformation) => {
  if (!file) return null;

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const err = new Error('Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    err.statusCode = 503;
    throw err;
  }

  try {
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        resource_type: 'image',
        folder: IMAGE_FOLDER,
        transformation
      }
    );

    if (!result.secure_url) {
      throw new Error('Cloudinary did not return a secure image URL.');
    }

    return result.secure_url;
  } catch (err) {
    const uploadError = new Error(`Cloudinary image upload failed: ${err.message}`);
    uploadError.statusCode = 502;
    throw uploadError;
  }
};

module.exports = { IMAGE_FOLDER, uploadImage };
