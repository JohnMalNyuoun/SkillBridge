const express = require('express');
const { openImage } = require('../services/mongodbImageService');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const image = await openImage(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': image.contentType,
      'X-Content-Type-Options': 'nosniff'
    });
    image.stream.on('error', next);
    image.stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
