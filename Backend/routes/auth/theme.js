const express = require('express');
const User = require('../../models/Users');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('theme');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { theme: user.theme || 'light' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/', protect, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ success: false, message: 'Invalid theme value' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.theme = theme;
    await user.save();
    return res.json({ success: true, data: { theme } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
