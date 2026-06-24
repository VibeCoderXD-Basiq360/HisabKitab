const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const c = require('./inventory.controller');

const ba = [auth, businessAuth];

router.get('/items',               ...ba, c.listItems);
router.post('/items',              ...ba, c.createItem);
router.put('/items/:id',           ...ba, c.updateItem);
router.post('/stock/add',          ...ba, c.addStock);
router.post('/stock/adjust',       ...ba, c.adjustStock);
router.post('/stock/transfer',     ...ba, c.transferStock);
router.get('/transactions',        ...ba, c.getTransactions);

module.exports = router;
