const { Router } = require('express');
const auth = require('../../middleware/auth');
const { getBalances, requestPayment, acceptPayment, rejectPayment } = require('./splits.controller');

const router = Router();
router.get('/balances', auth, getBalances);
router.post('/:splitId/pay', auth, requestPayment);
router.post('/:splitId/accept', auth, acceptPayment);
router.post('/:splitId/reject', auth, rejectPayment);

module.exports = router;
