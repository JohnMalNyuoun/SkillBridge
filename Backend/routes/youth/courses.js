const express = require('express');
const router = express.Router();
const {
	getAllCourses,
	getCourse,
	getCourseEngagement,
	toggleCourseReaction,
	addCourseComment
} = require('../../controllers/youth/courses');
const { protect } = require('../../middleware/auth');
const { isYouth } = require('../../middleware/isYouth');

router.get('/', protect, isYouth, getAllCourses);
router.get('/:id/engagement', protect, isYouth, getCourseEngagement);
router.put('/:id/reaction', protect, isYouth, toggleCourseReaction);
router.post('/:id/comments', protect, isYouth, addCourseComment);
router.get('/:id', protect, isYouth, getCourse);

module.exports = router;