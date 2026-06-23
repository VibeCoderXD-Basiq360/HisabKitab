const { Router } = require('express');
const auth = require('../../middleware/auth');
const { listRequests, sendRequest, acceptRequest, rejectRequest } = require('./contact.controller');

const router = Router();

router.get('/requests',              auth, listRequests);
router.post('/request',              auth, sendRequest);
router.post('/requests/:id/accept',  auth, acceptRequest);
router.post('/requests/:id/reject',  auth, rejectRequest);

module.exports = router;
