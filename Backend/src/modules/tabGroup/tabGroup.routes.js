const { Router } = require('express');
const auth = require('../../middleware/auth');
const {
  listGroups, createGroup, getGroup, acceptGroup, declineGroup, newMonth, deleteGroup,
} = require('./tabGroup.controller');

const router = Router();

router.get('/',                auth, listGroups);
router.post('/',               auth, createGroup);
router.get('/:id',             auth, getGroup);
router.post('/:id/accept',     auth, acceptGroup);
router.post('/:id/decline',    auth, declineGroup);
router.post('/:id/new-month',  auth, newMonth);
router.delete('/:id',          auth, deleteGroup);

module.exports = router;
