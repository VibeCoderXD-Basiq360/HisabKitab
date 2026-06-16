const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, getOne, update, remove } = require('./expense.controller');

const router = Router();
router.get('/', auth, list);
router.post('/', auth, create);
router.get('/:id', auth, getOne);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
module.exports = router;
