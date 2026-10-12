const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourse,
  cancelCourse,
  getPlatformStats
} = require('../../controllers/admin/courses');
const { protect } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');

router.get('/stats', protect, isAdmin, getPlatformStats);
router.get('/', protect, isAdmin, getAllCourses);
router.get('/:id', protect, isAdmin, getCourse);
router.put('/:id/cancel', protect, isAdmin, cancelCourse);

module.exports = router;