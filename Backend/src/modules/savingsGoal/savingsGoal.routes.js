const { Router } = require('express');
const auth = require('../../middleware/auth');
const { getGoal, upsertGoal, deleteGoal } = require('./savingsGoal.controller');

const router = Router();
router.get('/', auth, getGoal);
router.put('/', auth, upsertGoal);
router.delete('/', auth, deleteGoal);
module.exports = router;
