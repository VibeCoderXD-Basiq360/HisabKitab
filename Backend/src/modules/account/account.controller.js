const prisma = require('../../lib/prisma');

async function computeBalance(accountId, openingBalance) {
  const [incAgg, expAgg] = await Promise.all([
    prisma.income.aggregate({ where: { accountId }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { accountId }, _sum: { amount: true } }),
  ]);
  return Math.round(
    (Number(openingBalance) + Number(incAgg._sum.amount || 0) - Number(expAgg._sum.amount || 0)) * 100
  ) / 100;
}

const list = async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  const withBalance = await Promise.all(
    accounts.map(async (a) => ({ ...a, balance: await computeBalance(a.id, a.openingBalance) }))
  );
  res.json(withBalance);
};

const create = async (req, res) => {
  const { name, type, openingBalance, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const account = await prisma.account.create({
    data: {
      userId: req.user.userId,
      name,
      type: type || 'SAVINGS',
      openingBalance: Number(openingBalance) || 0,
      color: color || null,
      icon: icon || null,
    },
  });
  res.status(201).json({ ...account, balance: Number(account.openingBalance) });
};

const update = async (req, res) => {
  const { name, type, openingBalance, color, icon } = req.body;
  const existing = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.account.update({
    where: { id: req.params.id },
    data: {
      ...(name            !== undefined && { name }),
      ...(type            !== undefined && { type }),
      ...(openingBalance  !== undefined && { openingBalance: Number(openingBalance) }),
      ...(color           !== undefined && { color }),
      ...(icon            !== undefined && { icon }),
    },
  });
  const balance = await computeBalance(updated.id, updated.openingBalance);
  res.json({ ...updated, balance });
};

const remove = async (req, res) => {
  const existing = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  // Unlink transactions before soft-deleting
  await prisma.account.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
};

const ledger = async (req, res) => {
  const account = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!account) return res.status(404).json({ error: 'Not found' });

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { accountId: req.params.id },
      include: { category: true, paymentType: true },
      orderBy: { expenseDate: 'asc' },
    }),
    prisma.income.findMany({
      where: { accountId: req.params.id },
      orderBy: { incomeDate: 'asc' },
    }),
  ]);

  // Merge chronologically ascending to compute running balance
  const rows = [
    ...expenses.map((e) => ({ ...e, _type: 'expense', date: e.expenseDate })),
    ...incomes.map((i) => ({ ...i, _type: 'income', date: i.incomeDate })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let running = Number(account.openingBalance);
  const transactions = rows.map((r) => {
    if (r._type === 'income') running += Number(r.amount);
    else running -= Number(r.amount);
    return { ...r, runningBalance: Math.round(running * 100) / 100 };
  });

  // Return newest first for display
  transactions.reverse();

  const balance = await computeBalance(account.id, account.openingBalance);
  res.json({ account: { ...account, balance }, transactions });
};

module.exports = { list, create, update, remove, ledger };
