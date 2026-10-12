const { v2: cloudinary } = require('cloudinary');

const asClean = (value) => (typeof value === 'string' ? value.trim() : value);

cloudinary.config({
  cloud_name: asClean(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: asClean(process.env.CLOUDINARY_API_KEY),
  api_secret: asClean(process.env.CLOUDINARY_API_SECRET)
});

module.exports = cloudinary;
