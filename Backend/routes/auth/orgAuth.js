const express = require('express');
const router = express.Router();
const { registerOrg, loginOrg, requestReinstatement } = require('../../controllers/auth/orgAuth');

router.post('/register', registerOrg);
router.post('/login', loginOrg);
router.post('/reinstate-request', requestReinstatement);

module.exports = router;