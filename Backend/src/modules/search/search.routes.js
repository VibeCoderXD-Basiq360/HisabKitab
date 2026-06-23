const { Router } = require('express');
const auth = require('../../middleware/auth');
const { search } = require('./search.controller');

const router = Router();
router.get('/', auth, search);

module.exports = router;
