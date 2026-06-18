const prisma = require('../../lib/prisma');

const getGoal = async (req, res) => {
  const userId = req.user.userId;
  const goal = await prisma.savingsGoal.findUnique({ where: { userId } });
  res.json(goal || null);
};

const upsertGoal = async (req, res) => {
  const userId = req.user.userId;
  const { monthlyIncome = 0, monthlySavings } = req.body;

  if (!monthlySavings || Number(monthlySavings) <= 0) {
    return res.status(400).json({ error: 'monthlySavings must be a positive number' });
  }

  const goal = await prisma.savingsGoal.upsert({
    where: { userId },
    create: { userId, monthlyIncome: Number(monthlyIncome), monthlySavings: Number(monthlySavings) },
    update: { monthlyIncome: Number(monthlyIncome), monthlySavings: Number(monthlySavings) },
  });

  res.json(goal);
};

const deleteGoal = async (req, res) => {
  const userId = req.user.userId;
  await prisma.savingsGoal.deleteMany({ where: { userId } });
  res.json({ ok: true });
};

module.exports = { getGoal, upsertGoal, deleteGoal };
