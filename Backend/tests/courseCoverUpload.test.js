const test = require('node:test');
const assert = require('node:assert/strict');
const Course = require('../models/course');
const cloudinary = require('../config/cloudinary');
const { createCourse } = require('../controllers/organisation/courses');
const { IMAGE_FOLDER, uploadImage } = require('../services/cloudinaryImageService');

test('does not create a course without its selected cover image when Cloudinary rejects the upload', async () => {
  const originalUpload = cloudinary.uploader.upload;
  const originalCreate = Course.create;
  const originalEnv = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  };

  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  let uploadOptions;
  cloudinary.uploader.upload = async (_data, options) => {
    uploadOptions = options;
    throw new Error('status code - 403');
  };
  Course.create = async () => ({ _id: 'course-id' });

  const response = {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  try {
    await createCourse({
      body: {
        title: 'Test course',
        description: 'Course description',
        category: 'Education',
        targetAudience: 'Youth',
        location: 'Kakuma',
        deliveryMode: 'Online',
        startDate: '2026-11-01',
        endDate: '2026-12-01',
        applicationDeadline: '2026-10-31',
        totalSlots: '10',
        applicationQuestions: JSON.stringify([{ question: 'Why are you applying?' }])
      },
      file: { mimetype: 'image/png', buffer: Buffer.from('image') },
      user: { id: 'organisation-id' }
    }, response);

    assert.equal(response.statusCode, 502);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /^Cloudinary image upload failed:/);
    assert.equal(uploadOptions.folder, IMAGE_FOLDER);
  } finally {
    cloudinary.uploader.upload = originalUpload;
    Course.create = originalCreate;

    for (const [key, value] of Object.entries({
      CLOUDINARY_CLOUD_NAME: originalEnv.cloudName,
      CLOUDINARY_API_KEY: originalEnv.apiKey,
      CLOUDINARY_API_SECRET: originalEnv.apiSecret
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('stores uploaded profile and course images in the shared Cloudinary folder', async () => {
  const originalUpload = cloudinary.uploader.upload;
  const originalEnv = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  };

  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  let uploadOptions;
  cloudinary.uploader.upload = async (_data, options) => {
    uploadOptions = options;
    return { secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg' };
  };

  try {
    const url = await uploadImage(
      { mimetype: 'image/png', buffer: Buffer.from('image') },
      [{ width: 400, height: 400, crop: 'fill' }]
    );

    assert.equal(url, 'https://res.cloudinary.com/test/image/upload/test.jpg');
    assert.equal(uploadOptions.folder, 'fursahub');
    assert.equal(uploadOptions.resource_type, 'image');
  } finally {
    cloudinary.uploader.upload = originalUpload;

    for (const [key, value] of Object.entries({
      CLOUDINARY_CLOUD_NAME: originalEnv.cloudName,
      CLOUDINARY_API_KEY: originalEnv.apiKey,
      CLOUDINARY_API_SECRET: originalEnv.apiSecret
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
