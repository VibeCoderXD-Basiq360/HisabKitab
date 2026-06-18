const { Router } = require('express');
const auth = require('../../middleware/auth');
const { getBalances, requestPayment, acceptPayment, rejectPayment, waiveSplit, markReceived, getPaidForSummary, getPaidForPerson, getBalanceHistory } = require('./splits.controller');

const router = Router();
router.get('/balances', auth, getBalances);
router.get('/paid-for', auth, getPaidForSummary);
router.get('/paid-for/:personId', auth, getPaidForPerson);
router.get('/balance-history/:personId', auth, getBalanceHistory);
router.post('/:splitId/pay', auth, requestPayment);
router.post('/:splitId/accept', auth, acceptPayment);
router.post('/:splitId/reject', auth, rejectPayment);
router.post('/:splitId/waive', auth, waiveSplit);
router.post('/:splitId/mark-received', auth, markReceived);

module.exports = router;
