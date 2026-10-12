const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  deactivateUser,
  reactivateUser
} = require('../../controllers/admin/users');
const { protect } = require('../../middleware/auth');
const { isAdmin } = require('../../middleware/isAdmin');

router.get('/', protect, isAdmin, getAllUsers);
router.get('/:id', protect, isAdmin, getUser);
router.put('/:id/deactivate', protect, isAdmin, deactivateUser);
router.put('/:id/reactivate', protect, isAdmin, reactivateUser);

module.exports = router;