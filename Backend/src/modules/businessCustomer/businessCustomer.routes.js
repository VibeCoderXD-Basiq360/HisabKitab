const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const c = require('./businessCustomer.controller');

const ba = [auth, businessAuth];

router.get('/',      ...ba, c.list);
router.post('/',     ...ba, c.create);
router.put('/:id',   ...ba, c.update);
router.get('/:id',   ...ba, c.getDetail);

module.exports = router;
