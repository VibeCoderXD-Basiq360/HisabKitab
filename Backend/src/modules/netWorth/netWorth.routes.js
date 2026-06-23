const { Router } = require('express');
const auth = require('../../middleware/auth');
const { getNetWorth } = require('./netWorth.controller');

const router = Router();
router.get('/', auth, getNetWorth);

module.exports = router;
