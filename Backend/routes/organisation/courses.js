const express = require('express');
const router = express.Router();
const {
  createCourse,
  getOrgCourses,
  getOrgCourse,
  updateCourse,
  publishCourse,
  closeCourse,
  deleteCourse
} = require('../../controllers/organisation/courses');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');
const { uploadCourseImage } = require('../../middleware/upload');
const { error } = require('../../utils/apiResponse');

const handleCourseImageUpload = (req, res, next) => {
  uploadCourseImage.single('coverImage')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 400, 'Cover image is too large. Maximum size is 5MB.');
    }

    return error(res, 400, err.message || 'Invalid cover image upload');
  });
};

router.post('/', protect, isOrganisation, handleCourseImageUpload, createCourse);
router.get('/', protect, isOrganisation, getOrgCourses);
router.get('/:id', protect, isOrganisation, getOrgCourse);
router.put('/:id', protect, isOrganisation, handleCourseImageUpload, updateCourse);
router.put('/:id/publish', protect, isOrganisation, publishCourse);
router.put('/:id/close', protect, isOrganisation, closeCourse);
router.delete('/:id', protect, isOrganisation, deleteCourse);

module.exports = router;
