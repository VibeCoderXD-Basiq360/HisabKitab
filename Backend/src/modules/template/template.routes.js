const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, remove, use } = require('./template.controller');

const router = Router();

router.get('/',           auth, list);
router.post('/',          auth, create);
router.put('/:id',        auth, update);
router.delete('/:id',     auth, remove);
router.post('/:id/use',   auth, use);

module.exports = router;
