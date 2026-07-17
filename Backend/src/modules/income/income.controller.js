const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const userId = req.user.userId;
  const { fromDate, toDate, category } = req.query;

  const where = { userId };
  if (fromDate || toDate) {
    where.incomeDate = {};
    if (fromDate) where.incomeDate.gte = new Date(fromDate);
    if (toDate)   where.incomeDate.lte = new Date(toDate);
  }
  if (category) where.category = category;

  const incomes = await prisma.income.findMany({
    where,
    orderBy: { incomeDate: 'desc' },
  });
  res.json(incomes);
};

const summary = async (req, res) => {
  const userId = req.user.userId;
  const { fromDate, toDate } = req.query;

  const where = { userId };
  if (fromDate || toDate) {
    where.incomeDate = {};
    if (fromDate) where.incomeDate.gte = new Date(fromDate);
    if (toDate)   where.incomeDate.lte = new Date(toDate);
  }

  const [grouped, count] = await Promise.all([
    prisma.income.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.income.count({ where }),
  ]);
  const total = grouped.reduce((s, g) => s + Number(g._sum.amount || 0), 0);
  const byCategory = Object.fromEntries(grouped.map(g => [g.category, Number(g._sum.amount || 0)]));

  res.json({ total: Math.round(total * 100) / 100, count, byCategory });
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { amount, currency, title, category, source, incomeDate, note, tags, accountId } = req.body;

  if (!amount || !title || !incomeDate) {
    return res.status(400).json({ error: 'amount, title, incomeDate are required' });
  }

  const income = await prisma.income.create({
    data: {
      userId,
      amount:     Number(amount),
      currency:   currency || 'INR',
      title,
      category:   category || 'OTHER',
      source:     source || null,
      incomeDate: new Date(incomeDate),
      note:       note || null,
      tags:       tags || [],
      accountId:  accountId || null,
    },
  });

  res.status(201).json(income);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { amount, currency, title, category, source, incomeDate, note, tags, accountId } = req.body;

  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const income = await prisma.income.update({
    where: { id },
    data: {
      ...(amount     !== undefined && { amount: Number(amount) }),
      ...(currency   !== undefined && { currency }),
      ...(title      !== undefined && { title }),
      ...(category   !== undefined && { category }),
      ...(source     !== undefined && { source }),
      ...(incomeDate !== undefined && { incomeDate: new Date(incomeDate) }),
      ...(note       !== undefined && { note }),
      ...(tags       !== undefined && { tags }),
      ...(accountId  !== undefined && { accountId: accountId || null }),
    },
  });

  res.json(income);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const existing = await prisma.income.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.income.delete({ where: { id } });
  res.json({ ok: true });
};

module.exports = { list, summary, create, update, remove };
