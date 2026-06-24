const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const c = require('./businessExpense.controller');

const ba = [auth, businessAuth];

// auth-only feed for home page — returns [] if user has no business
router.get('/feed',              auth, c.feed);
router.get('/',                  ...ba, c.list);
router.post('/',                 ...ba, c.create);
router.delete('/:id',            ...ba, c.remove);
router.get('/withdrawals',       ...ba, c.listWithdrawals);
router.post('/withdrawals',      ...ba, c.withdraw);

module.exports = router;
