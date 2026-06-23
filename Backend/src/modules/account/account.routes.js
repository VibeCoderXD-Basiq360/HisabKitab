const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, remove, ledger } = require('./account.controller');

const router = Router();
router.get('/', auth, list);
router.post('/', auth, create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.get('/:id/ledger', auth, ledger);
module.exports = router;
