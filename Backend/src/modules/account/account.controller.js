const prisma = require('../../lib/prisma');

async function computeBalance(accountId, openingBalance, accountType) {
  if (accountType === 'CREDIT_CARD') {
    // Outstanding = opening balance + purchases - bill payments
    const [expAgg, payAgg] = await Promise.all([
      prisma.expense.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.creditCardPayment.aggregate({ where: { creditCardAccountId: accountId }, _sum: { amount: true } }),
    ]);
    return Math.round(
      (Number(openingBalance) + Number(expAgg._sum.amount || 0) - Number(payAgg._sum.amount || 0)) * 100
    ) / 100;
  } else {
    // Balance = opening + income - expenses - CC bill payments sent from this account
    const [incAgg, expAgg, payAgg] = await Promise.all([
      prisma.income.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { accountId }, _sum: { amount: true } }),
      prisma.creditCardPayment.aggregate({ where: { fromAccountId: accountId }, _sum: { amount: true } }),
    ]);
    return Math.round(
      (Number(openingBalance) + Number(incAgg._sum.amount || 0) - Number(expAgg._sum.amount || 0) - Number(payAgg._sum.amount || 0)) * 100
    ) / 100;
  }
}

const list = async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  const withBalance = await Promise.all(
    accounts.map(async (a) => ({ ...a, balance: await computeBalance(a.id, a.openingBalance, a.type) }))
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
      ...(name           !== undefined && { name }),
      ...(type           !== undefined && { type }),
      ...(openingBalance !== undefined && { openingBalance: Number(openingBalance) }),
      ...(color          !== undefined && { color }),
      ...(icon           !== undefined && { icon }),
    },
  });
  const balance = await computeBalance(updated.id, updated.openingBalance, updated.type);
  res.json({ ...updated, balance });
};

const remove = async (req, res) => {
  const existing = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.account.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
};

const payBill = async (req, res) => {
  const { amount, fromAccountId, paymentDate, note } = req.body;
  const account = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!account) return res.status(404).json({ error: 'Not found' });
  if (account.type !== 'CREDIT_CARD') return res.status(400).json({ error: 'Not a credit card account' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount is required' });

  // Validate the from-account belongs to the same user (if provided)
  if (fromAccountId) {
    const fromAcc = await prisma.account.findFirst({ where: { id: fromAccountId, userId: req.user.userId } });
    if (!fromAcc) return res.status(404).json({ error: 'fromAccount not found' });
  }

  const payment = await prisma.creditCardPayment.create({
    data: {
      userId: req.user.userId,
      creditCardAccountId: account.id,
      fromAccountId: fromAccountId || null,
      amount: Number(amount),
      paymentDate: new Date(paymentDate || Date.now()),
      note: note || null,
    },
    include: { creditCardAccount: true, fromAccount: true },
  });
  res.status(201).json(payment);
};

const ledger = async (req, res) => {
  const account = await prisma.account.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
  if (!account) return res.status(404).json({ error: 'Not found' });

  const isCC = account.type === 'CREDIT_CARD';
  let rows = [];

  if (isCC) {
    const [expenses, payments] = await Promise.all([
      prisma.expense.findMany({
        where: { accountId: req.params.id },
        include: { category: true },
        orderBy: { expenseDate: 'asc' },
      }),
      prisma.creditCardPayment.findMany({
        where: { creditCardAccountId: req.params.id },
        include: { fromAccount: true },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);
    rows = [
      ...expenses.map((e) => ({ ...e, _type: 'expense', date: e.expenseDate })),
      ...payments.map((p) => ({ ...p, _type: 'cc_payment', date: p.paymentDate })),
    ];
  } else {
    const [expenses, incomes, ccPayments] = await Promise.all([
      prisma.expense.findMany({
        where: { accountId: req.params.id },
        include: { category: true },
        orderBy: { expenseDate: 'asc' },
      }),
      prisma.income.findMany({
        where: { accountId: req.params.id },
        orderBy: { incomeDate: 'asc' },
      }),
      prisma.creditCardPayment.findMany({
        where: { fromAccountId: req.params.id },
        include: { creditCardAccount: true },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);
    rows = [
      ...expenses.map((e) => ({ ...e, _type: 'expense', date: e.expenseDate })),
      ...incomes.map((i) => ({ ...i, _type: 'income', date: i.incomeDate })),
      ...ccPayments.map((p) => ({ ...p, _type: 'cc_payment_sent', date: p.paymentDate })),
    ];
  }

  rows.sort((a, b) => new Date(a.date) - new Date(b.date));

  let running = Number(account.openingBalance);
  const transactions = rows.map((r) => {
    if (isCC) {
      if (r._type === 'expense') running += Number(r.amount); // purchase increases outstanding
      else running -= Number(r.amount);                        // payment reduces outstanding
    } else {
      if (r._type === 'income') running += Number(r.amount);
      else running -= Number(r.amount); // expense & cc_payment_sent both reduce balance
    }
    return { ...r, runningBalance: Math.round(running * 100) / 100 };
  });

  transactions.reverse();

  const balance = await computeBalance(account.id, account.openingBalance, account.type);
  res.json({ account: { ...account, balance }, transactions });
};

module.exports = { list, create, update, remove, payBill, ledger };
