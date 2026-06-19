const { Router } = require('express');
const auth = require('../../middleware/auth');
const {
  list, create, approve, reject, revoke,
  getExpenses, getBalance,
  createRepayment, approveRepayment, rejectRepayment,
  toggleWillRepay,
} = require('./cardDelegation.controller');

const router = Router();

router.get('/',           auth, list);
router.post('/',          auth, create);
router.get('/balance',    auth, getBalance);
router.post('/:id/approve', auth, approve);
router.post('/:id/reject',  auth, reject);
router.post('/:id/revoke',  auth, revoke);
router.get('/:id/expenses', auth, getExpenses);

router.post('/:id/repayments',                              auth, createRepayment);
router.post('/:id/repayments/:repaymentId/approve',         auth, approveRepayment);
router.post('/:id/repayments/:repaymentId/reject',          auth, rejectRepayment);

router.patch('/expenses/:expenseId/toggle-repay',           auth, toggleWillRepay);

module.exports = router;
