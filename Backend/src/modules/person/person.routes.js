const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, remove } = require('./person.controller');

const router = Router();
router.get('/', auth, list);
router.post('/', auth, create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
module.exports = router;
