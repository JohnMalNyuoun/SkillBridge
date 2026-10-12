const express = require('express');
const router = express.Router();
const { registerYouth, loginYouth } = require('../../controllers/auth/youthAuth');

router.get('/register', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Use POST to register. Send JSON body: { fullName, email, password, communityType }'
  });
});

router.get('/login', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Use POST to login. Send JSON body: { email, password }'
  });
});

router.post('/register', registerYouth);
router.post('/login', loginYouth);

module.exports = router;
