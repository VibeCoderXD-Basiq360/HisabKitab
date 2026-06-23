const router = require('express').Router();
const auth = require('../../middleware/auth');
const { list, summary, create, update, remove } = require('./income.controller');

router.use(auth);
router.get('/summary', summary); // must be before /:id
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
