const router = require('express').Router();
const auth = require('../../middleware/auth');
const { get } = require('./insights.controller');

router.use(auth);
router.get('/', get);

module.exports = router;
