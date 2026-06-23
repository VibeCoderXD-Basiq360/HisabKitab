const { Router } = require('express');
const auth = require('../../middleware/auth');
const {
  listTabs, createTab, getTab, acceptTab, declineTab, deleteTab,
  addEntry, updateEntry, deleteEntry, addSettlement, deleteSettlement,
} = require('./sharedTab.controller');

const router = Router();

router.get('/',                        auth, listTabs);
router.post('/',                       auth, createTab);
router.get('/:id',                     auth, getTab);
router.post('/:id/accept',             auth, acceptTab);
router.post('/:id/decline',            auth, declineTab);
router.delete('/:id',                  auth, deleteTab);
router.post('/:id/entries',                          auth, addEntry);
router.patch('/:id/entries/:entryId',               auth, updateEntry);
router.delete('/:id/entries/:entryId',               auth, deleteEntry);
router.post('/:id/settlements',                      auth, addSettlement);
router.delete('/:id/settlements/:settlementId',      auth, deleteSettlement);

module.exports = router;
