const { Router } = require('express');
const auth = require('../../middleware/auth');
const {
  registrationOptions, registrationVerify,
  authOptions, authVerify,
  firebaseActionToken,
  listCredentials, removeCredential,
} = require('./webauthn.controller');

const router = Router();

router.get('/register-options',     auth, registrationOptions);
router.post('/register-verify',     auth, registrationVerify);
router.get('/authenticate-options', auth, authOptions);
router.post('/authenticate-verify', auth, authVerify);
router.post('/firebase-action-token', auth, firebaseActionToken);
router.get('/credentials',          auth, listCredentials);
router.delete('/credentials/:id',   auth, removeCredential);

module.exports = router;
