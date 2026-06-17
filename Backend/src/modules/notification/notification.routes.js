const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { list, markRead, markAllRead, deleteOne } = require('./notification.controller');

router.get('/', auth, list);
router.patch('/read-all', auth, markAllRead); // must be before /:id
router.patch('/:id/read', auth, markRead);
router.delete('/:id', auth, deleteOne);

module.exports = router;
