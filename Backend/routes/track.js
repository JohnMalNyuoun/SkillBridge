const express = require('express');
const router = express.Router();
const { trackShare } = require('../controllers/track');

router.post('/share', trackShare);

module.exports = router;
