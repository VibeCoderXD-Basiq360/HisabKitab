const router = require('express').Router();
const auth = require('../../middleware/auth');
const businessAuth = require('../../middleware/businessAuth');
const c = require('./businessJob.controller');

const ba = [auth, businessAuth];

router.get('/',      ...ba, c.listJobs);
router.get('/:id',   ...ba, c.getJob);
router.post('/',     ...ba, c.createJob);
router.patch('/:id', ...ba, c.updateJob);

module.exports = router;
