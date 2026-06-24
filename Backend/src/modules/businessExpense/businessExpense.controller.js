const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const { from, to } = req.query;
  const expenses = await prisma.businessExpense.findMany({
    where: {
      businessId: req.businessId,
      ...(from && to && { date: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: { location: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(expenses);
};

const create = async (req, res) => {
  const { category, amount, date, vendor, locationId, note } = req.body;
  if (!category || !amount || !date) return res.status(400).json({ error: 'category, amount, date required' });
  const expense = await prisma.businessExpense.create({
    data: {
      businessId: req.businessId,
      locationId: locationId || null,
      category, amount: Number(amount),
      date: new Date(date),
      vendor: vendor || null,
      note: note || null,
    },
    include: { location: { select: { id: true, name: true } } },
  });
  res.status(201).json(expense);
};

const remove = async (req, res) => {
  await prisma.businessExpense.deleteMany({ where: { id: req.params.id, businessId: req.businessId } });
  res.status(204).end();
};

// POST /business-expenses/partner-withdrawal
const withdraw = async (req, res) => {
  const { amount, date, note } = req.body;
  if (!amount || !date) return res.status(400).json({ error: 'amount and date required' });
  const w = await prisma.partnerWithdrawal.create({
    data: { partnerId: req.partner.id, amount: Number(amount), date: new Date(date), note: note || null },
  });
  res.status(201).json(w);
};

const listWithdrawals = async (req, res) => {
  const withdrawals = await prisma.partnerWithdrawal.findMany({
    where: { partner: { businessId: req.businessId } },
    include: { partner: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { date: 'desc' },
  });
  res.json(withdrawals);
};

module.exports = { list, create, remove, withdraw, listWithdrawals };
