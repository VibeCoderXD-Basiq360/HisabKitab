const prisma = require('../../lib/prisma');

const CYCLE_MONTHS = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12 };

function advanceDueDate(current, cycle) {
  const d = new Date(current);
  d.setMonth(d.getMonth() + (CYCLE_MONTHS[cycle] || 1));
  return d;
}

const list = async (req, res) => {
  const userId = req.user.userId;
  const { active } = req.query;

  const where = { userId };
  if (active === 'true')  where.isActive = true;
  if (active === 'false') where.isActive = false;

  const subs = await prisma.subscription.findMany({
    where,
    orderBy: { nextDueDate: 'asc' },
  });

  const now = new Date();
  const result = subs.map((s) => ({
    ...s,
    monthlyAmount: Number(s.amount) / (CYCLE_MONTHS[s.billingCycle] || 1),
    daysUntilDue:  Math.ceil((new Date(s.nextDueDate) - now) / (1000 * 60 * 60 * 24)),
  }));

  res.json(result);
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { name, amount, currency, billingCycle, nextDueDate, category, logo, isAutoPay, note } = req.body;

  if (!name || !amount || !nextDueDate) {
    return res.status(400).json({ error: 'name, amount, nextDueDate are required' });
  }

  const sub = await prisma.subscription.create({
    data: {
      userId,
      name,
      amount:      Number(amount),
      currency:    currency || 'INR',
      billingCycle: billingCycle || 'MONTHLY',
      nextDueDate: new Date(nextDueDate),
      category:    category || 'Entertainment',
      logo:        logo || null,
      isAutoPay:   isAutoPay || false,
      note:        note || null,
    },
  });

  res.status(201).json(sub);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { name, amount, currency, billingCycle, nextDueDate, category, logo, isAutoPay, isActive, note } = req.body;

  const existing = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const sub = await prisma.subscription.update({
    where: { id },
    data: {
      ...(name         !== undefined && { name }),
      ...(amount       !== undefined && { amount: Number(amount) }),
      ...(currency     !== undefined && { currency }),
      ...(billingCycle !== undefined && { billingCycle }),
      ...(nextDueDate  !== undefined && { nextDueDate: new Date(nextDueDate) }),
      ...(category     !== undefined && { category }),
      ...(logo         !== undefined && { logo }),
      ...(isAutoPay    !== undefined && { isAutoPay }),
      ...(isActive     !== undefined && { isActive }),
      ...(note         !== undefined && { note }),
    },
  });

  res.json(sub);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const existing = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.subscription.delete({ where: { id } });
  res.json({ ok: true });
};

// Advance nextDueDate by one billing cycle (mark as paid for this period)
const renew = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const sub = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!sub) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.subscription.update({
    where: { id },
    data: { nextDueDate: advanceDueDate(sub.nextDueDate, sub.billingCycle) },
  });

  res.json({ ...updated, monthlyAmount: Number(updated.amount) / (CYCLE_MONTHS[updated.billingCycle] || 1) });
};

module.exports = { list, create, update, remove, renew };
