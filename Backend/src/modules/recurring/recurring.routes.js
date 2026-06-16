const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, remove } = require('./recurring.controller');

const router = Router();
router.get('/', auth, list);
router.post('/', auth, create);
router.patch('/:id', auth, update);
router.delete('/:id', auth, remove);

module.exports = router;
