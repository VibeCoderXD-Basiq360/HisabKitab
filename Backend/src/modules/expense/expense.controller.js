const prisma = require('../../lib/prisma');
const { sendNotification } = require('../../lib/notify');

const include = {
  category: true,
  paymentType: true,
  people: { include: { person: true } },
  paidForPerson: true,
  splits: {
    include: {
      person: true,
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  },
};

async function syncSplits(expenseId, expenseTitle, payerId, amount, peopleIds, paidForPersonId) {
  await prisma.expenseSplit.deleteMany({ where: { expenseId } });

  const payer = await prisma.user.findUnique({ where: { id: payerId }, select: { name: true } });
  const payerName = payer?.name || 'Someone';

  if (paidForPersonId) {
    const split = await prisma.expenseSplit.create({
      data: { expenseId, personId: paidForPersonId, amount },
      include: { person: { include: { linkedUser: { select: { fcmToken: true } } } } },
    });
    const fcmToken = split.person.linkedUser?.fcmToken;
    if (fcmToken) {
      await sendNotification(fcmToken, {
        title: 'Expense paid on your behalf',
        body: `${payerName} paid ₹${amount} for "${expenseTitle || 'an expense'}" for you`,
        data: { type: 'PAID_FOR_CREATED', splitId: split.id },
      });
    }
    return;
  }

  if (!peopleIds.length) return;

  const share = Math.round((amount / (peopleIds.length + 1)) * 100) / 100;

  const splits = await Promise.all(
    peopleIds.map((personId) =>
      prisma.expenseSplit.create({
        data: { expenseId, personId, amount: share },
        include: { person: { include: { linkedUser: { select: { id: true, name: true, fcmToken: true } } } } },
      })
    )
  );

  for (const split of splits) {
    const linkedUser = split.person.linkedUser;
    if (linkedUser?.fcmToken) {
      await sendNotification(linkedUser.fcmToken, {
        title: 'New expense split',
        body: `${payerName} added "${expenseTitle || 'an expense'}" — you owe ₹${share}`,
        data: { type: 'SPLIT_CREATED', splitId: split.id },
      });
    }
  }
}

const list = async (req, res) => {
  const { fromDate, toDate, categoryId, paymentTypeId, personId, search, page = 1, limit = 20 } = req.query;

  const where = { userId: req.user.userId };

  if (fromDate || toDate) {
    where.expenseDate = {};
    if (fromDate) where.expenseDate.gte = new Date(fromDate);
    if (toDate) where.expenseDate.lte = new Date(toDate);
  }
  if (categoryId) where.categoryId = categoryId;
  if (paymentTypeId) where.paymentTypeId = paymentTypeId;
  if (personId) where.people = { some: { personId } };
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [total, data] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({ where, include, orderBy: { expenseDate: 'desc' }, skip, take }),
  ]);

  res.json({ data, total, page: Number(page), limit: take });
};

const create = async (req, res) => {
  const { amount, currency, title, note, expenseDate, categoryId, paymentTypeId, peopleIds = [], paidForPersonId } = req.body;

  const splitPeopleIds = paidForPersonId ? [] : peopleIds;

  const expense = await prisma.expense.create({
    data: {
      userId: req.user.userId,
      amount,
      currency: currency || 'INR',
      title,
      note,
      expenseDate: new Date(expenseDate),
      categoryId: categoryId || null,
      paymentTypeId,
      paidForPersonId: paidForPersonId || null,
      people: { create: splitPeopleIds.map((personId) => ({ personId })) },
    },
    include,
  });

  await syncSplits(expense.id, title, req.user.userId, Number(amount), splitPeopleIds, paidForPersonId || null);

  const full = await prisma.expense.findUnique({ where: { id: expense.id }, include });
  res.status(201).json(full);
};

const getOne = async (req, res) => {
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
    include,
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  res.json(expense);
};

const update = async (req, res) => {
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const { amount, currency, title, note, expenseDate, categoryId, paymentTypeId, peopleIds = [], paidForPersonId } = req.body;

  const splitPeopleIds = paidForPersonId ? [] : peopleIds;

  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      amount,
      currency,
      title,
      note,
      expenseDate: new Date(expenseDate),
      categoryId: categoryId || null,
      paymentTypeId,
      paidForPersonId: paidForPersonId || null,
      people: {
        deleteMany: {},
        create: splitPeopleIds.map((personId) => ({ personId })),
      },
    },
    include,
  });

  await syncSplits(expense.id, title, req.user.userId, Number(amount), splitPeopleIds, paidForPersonId || null);

  const full = await prisma.expense.findUnique({ where: { id: expense.id }, include });
  res.json(full);
};

const remove = async (req, res) => {
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, create, getOne, update, remove };
