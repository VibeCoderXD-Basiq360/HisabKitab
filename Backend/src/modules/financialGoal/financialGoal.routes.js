const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, remove, contribute } = require('./financialGoal.controller');

const router = Router();

router.get('/',               auth, list);
router.post('/',              auth, create);
router.put('/:id',            auth, update);
router.delete('/:id',         auth, remove);
router.patch('/:id/contribute', auth, contribute);

module.exports = router;
