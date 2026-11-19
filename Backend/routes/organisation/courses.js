const express = require('express');
const router = express.Router();
const {
  createCourse,
  getOrgCourses,
  getOrgDiscoverCourses,
  getOrgCourse,
  updateCourse,
  publishCourse,
  closeCourse,
  deleteCourse
} = require('../../controllers/organisation/courses');
const {
  createCourseGroupChat,
  getCourseGroupChat,
  updateGroupChatModerators,
  updateGroupChatMembers,
  requireGroupChatAccess,
  uploadChatAttachment,
  downloadChatAttachment
} = require('../../controllers/organisation/groupChat');
const { startCourseCall } = require('../../controllers/courseCalls');
const { protect } = require('../../middleware/auth');
const { isOrganisation } = require('../../middleware/isOrganisation');
const { isOrgAdmin } = require('../../middleware/isOrgAdmin');
const { isOrgApplicantReviewer } = require('../../middleware/isOrgApplicantReviewer');
const {
  uploadCourseImage,
  uploadGroupChatAttachment
} = require('../../middleware/upload');
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

const handleGroupChatAttachmentUpload = (req, res, next) => {
  uploadGroupChatAttachment.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 400, 'Attachment is too large. Maximum size is 10MB.');
    }

    return error(res, 400, err.message || 'Invalid group chat attachment.');
  });
};

router.post('/', protect, isOrganisation, handleCourseImageUpload, createCourse);
router.post('/:courseId/group-chat', protect, isOrgAdmin, createCourseGroupChat);
router.post(
  '/:courseId/group-chat/attachments',
  protect,
  requireGroupChatAccess,
  handleGroupChatAttachmentUpload,
  uploadChatAttachment
);
router.get(
  '/:courseId/group-chat/attachments/:attachmentId',
  protect,
  requireGroupChatAccess,
  downloadChatAttachment
);
router.get('/:courseId/group-chat', protect, getCourseGroupChat);
router.patch('/:courseId/group-chat/moderators', protect, isOrgAdmin, updateGroupChatModerators);
router.patch('/:courseId/group-chat/members', protect, updateGroupChatMembers);
router.post('/:courseId/group-calls', protect, isOrgApplicantReviewer, startCourseCall);
router.get('/', protect, isOrgApplicantReviewer, getOrgCourses);
router.get('/discover', protect, isOrganisation, getOrgDiscoverCourses);
router.get('/:id', protect, isOrgApplicantReviewer, getOrgCourse);
router.put('/:id', protect, isOrganisation, handleCourseImageUpload, updateCourse);
router.put('/:id/publish', protect, isOrganisation, publishCourse);
router.put('/:id/close', protect, isOrganisation, closeCourse);
router.delete('/:id', protect, isOrganisation, deleteCourse);

module.exports = router;
