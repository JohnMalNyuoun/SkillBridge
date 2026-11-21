const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const MediaAsset = require('../models/MediaAsset');
const { upload, useCloudinary } = require('../services/media.service');
const cloudinary = useCloudinary ? require('../config/cloudinary') : null;

exports.uploadMiddleware = upload.single('file');

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const f = req.file;
  const isVideo = (f.mimetype || '').startsWith('video/');

  let doc;
  if (useCloudinary) {
    doc = {
      url: f.path,
      secureUrl: f.path,
      publicId: f.filename,
      resourceType: f.resource_type || (isVideo ? 'video' : 'image'),
      format: f.format,
      width: f.width,
      height: f.height,
      folder: f.folder,
    };
  } else {
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const rel = path.relative(uploadsRoot, f.path).split(path.sep).join('/');
    const publicUrl = `/uploads/${rel}`;
    doc = {
      url: publicUrl,
      secureUrl: publicUrl,
      publicId: rel,
      resourceType: isVideo ? 'video' : 'image',
      format: (path.extname(f.originalname) || '').replace('.', '').toLowerCase() || undefined,
      folder: path.dirname(rel),
    };
  }

  const asset = await MediaAsset.create({
    owner: req.user.id,
    ...doc,
    bytes: f.size,
    purpose: req.body.purpose || 'other',
    relatedTo:
      req.body.relatedKind && req.body.relatedId
        ? { kind: req.body.relatedKind, id: req.body.relatedId }
        : undefined,
  });
  res.status(201).json({ asset });
});

exports.remove = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  if (req.user.role !== 'admin' && String(asset.owner) !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    if (useCloudinary) {
      await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
    } else {
      const filePath = path.resolve(__dirname, '../../uploads', asset.publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[media.remove] best-effort file delete failed:', err.message);
  }
  await asset.deleteOne();
  res.json({ ok: true });
});

exports.listMine = asyncHandler(async (req, res) => {
  const filter = { owner: req.user.id };
  if (req.query.purpose) filter.purpose = req.query.purpose;
  const items = await MediaAsset.find(filter).sort('-createdAt');
  res.json({ items });
});
