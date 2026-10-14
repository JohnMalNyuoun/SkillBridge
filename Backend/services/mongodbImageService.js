const { finished } = require('node:stream/promises');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const IMAGE_ROUTE_PREFIX = '/api/images/';
const BUCKET_NAME = 'images';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
let cachedDb;
let cachedBucket;

const getBucket = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connection.asPromise();
  }

  const db = mongoose.connection.db;
  if (!db) {
    const err = new Error('MongoDB is not connected.');
    err.statusCode = 503;
    throw err;
  }

  if (db !== cachedDb) {
    cachedDb = db;
    cachedBucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  }

  return cachedBucket;
};

const imageIdFromUrl = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(/^\/api\/images\/([a-f\d]{24})$/i);
  return match ? new ObjectId(match[1]) : null;
};

const uploadImage = async (file) => {
  if (!file) return null;
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !Buffer.isBuffer(file.buffer)) {
    const err = new Error('Invalid image upload.');
    err.statusCode = 400;
    throw err;
  }

  const bucket = await getBucket();
  const id = new ObjectId();
  const uploadStream = bucket.openUploadStreamWithId(id, id.toHexString(), {
    metadata: { contentType: file.mimetype }
  });

  uploadStream.end(file.buffer);
  await finished(uploadStream);

  return `${IMAGE_ROUTE_PREFIX}${id.toHexString()}`;
};

const openImage = async (id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  const bucket = await getBucket();
  const objectId = new ObjectId(id);
  const file = await bucket.find({ _id: objectId }).limit(1).next();
  if (!file) return null;

  return {
    contentType: ALLOWED_MIME_TYPES.has(file.metadata?.contentType)
      ? file.metadata.contentType
      : 'application/octet-stream',
    stream: bucket.openDownloadStream(objectId)
  };
};

const deleteImage = async (url) => {
  const id = imageIdFromUrl(url);
  if (!id) return;

  const bucket = await getBucket();
  const file = await bucket.find({ _id: id }).limit(1).next();
  if (file) await bucket.delete(id);
};

module.exports = { deleteImage, imageIdFromUrl, openImage, uploadImage };
