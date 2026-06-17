const express = require('express');
const auth = require('../../middleware/auth');
const { list, create, respond, cancel } = require('./bulkPayment.controller');

const router = express.Router();

router.get('/', auth, list);
router.post('/', auth, create);
router.patch('/:id/respond', auth, respond);
router.patch('/:id/cancel', auth, cancel);

module.exports = router;
