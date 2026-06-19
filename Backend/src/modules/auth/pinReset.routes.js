const { Router } = require('express');
const auth = require('../../middleware/auth');
const { requestOTP, verifyOTP } = require('./pinReset.controller');

const router = Router();

router.post('/request', auth, requestOTP);
router.post('/verify',  auth, verifyOTP);

module.exports = router;
