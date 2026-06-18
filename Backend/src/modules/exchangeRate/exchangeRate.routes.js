const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, refresh, upsert } = require('./exchangeRate.controller');

const router = Router();
router.get('/',         auth, list);
router.post('/refresh', auth, refresh);
router.put('/:from',    auth, upsert);

module.exports = router;
