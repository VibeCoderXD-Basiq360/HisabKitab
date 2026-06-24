const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const { getPL } = require('./businessPL.controller');

router.get('/', auth, businessAuth, getPL);

module.exports = router;
