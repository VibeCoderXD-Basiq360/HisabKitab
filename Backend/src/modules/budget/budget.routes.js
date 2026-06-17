const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, upsert, remove } = require('./budget.controller');

const router = Router();
router.get('/', auth, list);
router.put('/:categoryId', auth, upsert);
router.delete('/:id', auth, remove);

module.exports = router;
