const { Router } = require('express');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { getMe, updateMe, uploadProfileImage, saveFcmToken } = require('./user.controller');

const router = Router();
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.post('/profile-image', auth, upload.single('image'), uploadProfileImage);
router.post('/fcm-token', auth, saveFcmToken);
module.exports = router;
