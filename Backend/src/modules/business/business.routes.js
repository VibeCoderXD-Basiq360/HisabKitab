const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const c = require('./business.controller');

router.get('/',                           auth, c.getMyBusiness);
router.post('/',                          auth, c.createBusiness);
router.put('/settings',                   auth, businessAuth, c.updateSettings);
router.post('/locations',                 auth, businessAuth, c.addLocation);
router.get('/partners/invites',           auth, c.listInvites);
router.post('/partners/invite',           auth, businessAuth, c.invitePartner);
router.post('/partners/:id/accept',       auth, c.acceptInvite);
router.post('/partners/:id/decline',      auth, c.declineInvite);
router.put('/partners/:partnerId',        auth, businessAuth, c.updatePartner);

router.get('/printer-profiles',           auth, businessAuth, c.listPrinterProfiles);
router.post('/printer-profiles',          auth, businessAuth, c.createPrinterProfile);
router.put('/printer-profiles/:id',       auth, businessAuth, c.updatePrinterProfile);
router.delete('/printer-profiles/:id',    auth, businessAuth, c.deletePrinterProfile);

module.exports = router;
