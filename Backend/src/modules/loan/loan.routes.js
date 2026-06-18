const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, getOne, update, remove, markPaid, markUnpaid } = require('./loan.controller');

const router = Router();
router.get('/', auth, list);
router.post('/', auth, create);
router.get('/:id', auth, getOne);
router.patch('/:id', auth, update);
router.delete('/:id', auth, remove);
router.post('/:id/payments/:month', auth, markPaid);
router.delete('/:id/payments/:month', auth, markUnpaid);
module.exports = router;
