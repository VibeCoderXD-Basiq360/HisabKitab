const router = require('express').Router();
const auth = require('../../middleware/auth');
const { list, create, update, remove, renew } = require('./subscription.controller');

router.use(auth);
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.post('/:id/renew', renew);
router.delete('/:id', remove);

module.exports = router;
