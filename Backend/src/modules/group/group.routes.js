const express = require('express');
const auth = require('../../middleware/auth');
const { list, create, getGroup, addExpense, deleteExpense, recordSettlement, searchUsers } = require('./group.controller');
const router = express.Router();

router.get('/search-users', auth, searchUsers);
router.get('/', auth, list);
router.post('/', auth, create);
router.get('/:id', auth, getGroup);
router.post('/:id/expenses', auth, addExpense);
router.delete('/:id/expenses/:eid', auth, deleteExpense);
router.post('/:id/settlements', auth, recordSettlement);

module.exports = router;
