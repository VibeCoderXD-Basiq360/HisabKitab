const { Router } = require('express');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { list, create, getOne, update, remove, analytics, trend, exportCsv, uploadReceipt, importCsv } = require('./expense.controller');

const router = Router();
router.get('/analytics/trend', auth, trend);
router.get('/analytics', auth, analytics);
router.get('/export', auth, exportCsv);
router.get('/', auth, list);
router.post('/', auth, create);
router.post('/import', auth, importCsv);
router.get('/:id', auth, getOne);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.post('/:id/receipt', auth, upload.single('image'), uploadReceipt);
module.exports = router;
