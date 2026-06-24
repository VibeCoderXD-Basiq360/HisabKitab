const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

const list = async (req, res) => {
  const userId = req.user.userId;
  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: [{ isCompleted: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(goals);
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { name, emoji, targetAmount, savedAmount, deadline, color } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!targetAmount || Number(targetAmount) <= 0) return res.status(400).json({ error: 'targetAmount must be positive' });

  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name: name.trim(),
      emoji: emoji || null,
      targetAmount: Number(targetAmount),
      savedAmount: savedAmount ? Number(savedAmount) : 0,
      deadline: deadline ? new Date(deadline) : null,
      color: color || 'emerald',
    },
  });
  res.status(201).json(goal);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { name, emoji, targetAmount, savedAmount, deadline, color, isCompleted } = req.body;

  const existing = await prisma.financialGoal.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const goal = await prisma.financialGoal.update({
    where: { id },
    data: {
      name:         name !== undefined        ? name.trim()          : existing.name,
      emoji:        emoji !== undefined       ? (emoji || null)      : existing.emoji,
      targetAmount: targetAmount !== undefined ? Number(targetAmount) : existing.targetAmount,
      savedAmount:  savedAmount !== undefined  ? Number(savedAmount)  : existing.savedAmount,
      deadline:     deadline !== undefined    ? (deadline ? new Date(deadline) : null) : existing.deadline,
      color:        color !== undefined       ? (color || 'emerald') : existing.color,
      isCompleted:  isCompleted !== undefined ? Boolean(isCompleted) : existing.isCompleted,
    },
  });
  res.json(goal);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const existing = await prisma.financialGoal.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.financialGoal.delete({ where: { id } });
  res.json({ ok: true });
};

// Add/subtract from savedAmount
const contribute = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: 'amount is required' });

  const existing = await prisma.financialGoal.findFirst({
    where: { id, userId },
    include: { user: { select: { fcmToken: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const target = Number(existing.targetAmount);
  const oldPct = Math.round((Number(existing.savedAmount) / target) * 100);
  const newSaved = Math.max(0, Number(existing.savedAmount) + Number(amount));
  const newPct = Math.round((newSaved / target) * 100);
  const isCompleted = newSaved >= target;

  const goal = await prisma.financialGoal.update({
    where: { id },
    data: { savedAmount: newSaved, isCompleted },
  });

  // Fire milestone notifications (25%, 50%, goal reached)
  const milestones = [
    { pct: 25, title: `25% saved: ${existing.name}`, body: `You're a quarter of the way to your goal!` },
    { pct: 50, title: `Halfway there: ${existing.name}`, body: `You've saved 50% of your ₹${target.toLocaleString('en-IN')} goal.` },
    { pct: 100, title: `Goal reached! ${existing.emoji || '🎉'} ${existing.name}`, body: `You've hit your ₹${target.toLocaleString('en-IN')} savings goal. Congratulations!` },
  ];
  for (const m of milestones) {
    if (oldPct < m.pct && newPct >= m.pct) {
      notify(userId, existing.user.fcmToken, {
        title: m.title,
        body: m.body,
        data: { type: 'GOAL_MILESTONE', goalId: id, pct: String(m.pct) },
      }).catch(() => {});
      break; // only fire the highest milestone crossed in one contribution
    }
  }

  res.json(goal);
};

module.exports = { list, create, update, remove, contribute };
