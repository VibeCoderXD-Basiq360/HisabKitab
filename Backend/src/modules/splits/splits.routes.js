const { Router } = require('express');
const auth = require('../../middleware/auth');
const { getBalances, requestPayment, acceptPayment, rejectPayment, getPaidForSummary, getPaidForPerson } = require('./splits.controller');

const router = Router();
router.get('/balances', auth, getBalances);
router.get('/paid-for', auth, getPaidForSummary);
router.get('/paid-for/:personId', auth, getPaidForPerson);
router.post('/:splitId/pay', auth, requestPayment);
router.post('/:splitId/accept', auth, acceptPayment);
router.post('/:splitId/reject', auth, rejectPayment);

module.exports = router;
