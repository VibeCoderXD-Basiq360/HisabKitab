const { Router } = require('express');
const auth = require('../../middleware/auth');
const { listActivity } = require('./activity.controller');

const router = Router();
router.get('/', auth, listActivity);
module.exports = router;
