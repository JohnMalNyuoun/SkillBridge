const { finished } = require('node:stream/promises');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const BUCKET_NAME = 'groupChatAttachments';
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
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

const sanitizeFileName = (name) => {
  const sanitized = String(name || 'attachment')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200);
  return sanitized || 'attachment';
};

const getAttachment = async (id) => {
  if (!/^[a-f\d]{24}$/i.test(id || '')) return null;
  const bucket = await getBucket();
  return bucket.find({ _id: new ObjectId(id) }).limit(1).next();
};

const uploadGroupChatAttachment = async (file, groupChatId, courseId) => {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    !ALLOWED_MIME_TYPES.has(file.mimetype) ||
    !file.buffer.length
  ) {
    const err = new Error('Invalid group chat attachment.');
    err.statusCode = 400;
    throw err;
  }

  const bucket = await getBucket();
  const id = new ObjectId();
  const name = sanitizeFileName(file.originalname);
  const uploadStream = bucket.openUploadStreamWithId(id, name, {
    metadata: {
      groupChat: new ObjectId(groupChatId),
      course: new ObjectId(courseId),
      name,
      contentType: file.mimetype
    }
  });

  uploadStream.end(file.buffer);
  await finished(uploadStream);

  return {
    id: id.toHexString(),
    name,
    mimeType: file.mimetype,
    size: file.buffer.length
  };
};

const openGroupChatAttachment = async (id) => {
  const file = await getAttachment(id);
  if (!file) return null;
  const bucket = await getBucket();
  return {
    file,
    stream: bucket.openDownloadStream(file._id)
  };
};

module.exports = {
  ALLOWED_MIME_TYPES,
  getAttachment,
  openGroupChatAttachment,
  uploadGroupChatAttachment
};
