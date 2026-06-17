const { addDays, addWeeks, addMonths, addYears, subMonths, startOfMonth, endOfMonth, format } = require('date-fns');
const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');
const cloudinary = require('../../config/cloudinary');
const { processDueRecurring } = require('../recurring/recurring.controller');

async function checkBudgetAlert(userId, categoryId) {
  if (!categoryId) return;
  const budget = await prisma.budget.findFirst({ where: { userId, categoryId } });
  if (!budget) return;

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const spendResult = await prisma.expense.aggregate({
    where: { userId, categoryId, expenseDate: { gte: fromDate } },
    _sum: { amount: true },
  });

  const spent = Number(spendResult._sum.amount || 0);
  const limit = Number(budget.amount);
  const pct = (spent / limit) * 100;

  const alertType = pct >= 100 ? 'BUDGET_ALERT_100' : pct >= 80 ? 'BUDGET_ALERT_80' : null;
  if (!alertType) return;

  // Don't re-notify if already sent this month for this threshold
  const existing = await prisma.notification.findFirst({
    where: { userId, type: alertType, createdAt: { gte: fromDate } },
  });
  if (existing) return;

  const [category, user] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, icon: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } }),
  ]);

  const label = `${category?.icon || ''} ${category?.name || 'Category'}`.trim();
  const isOver = pct >= 100;
  await notify(userId, user?.fcmToken, {
    title: isOver ? `⚠️ Budget exceeded: ${label}` : `⚠️ Budget alert: ${label}`,
    body: isOver
      ? `You've exceeded your ${label} budget — ₹${Math.round(spent)} spent of ₹${Math.round(limit)}`
      : `${Math.round(pct)}% of your ${label} budget used — ₹${Math.round(spent)} of ₹${Math.round(limit)}`,
    data: { type: alertType, categoryId },
  });
}

function recurringNextDate(base, frequency) {
  const d = new Date(base);
  switch (frequency) {
    case 'DAILY':   return addDays(d, 1);
    case 'WEEKLY':  return addWeeks(d, 1);
    case 'YEARLY':  return addYears(d, 1);
    default:        return addMonths(d, 1);
  }
}

const include = {
  category: true,
  paymentType: true,
  people: { include: { person: true } },
  paidForPerson: true,
  recurringExpense: { select: { id: true, frequency: true, isActive: true } },
  group: { select: { id: true, name: true, icon: true } },
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
      include: { person: { include: { linkedUser: { select: { id: true, fcmToken: true } } } } },
    });
    const linkedUser = split.person.linkedUser;
    await notify(linkedUser?.id, linkedUser?.fcmToken, {
      title: 'Expense paid on your behalf',
      body: `${payerName} paid ₹${amount} for "${expenseTitle || 'an expense'}" for you`,
      data: { type: 'PAID_FOR_CREATED', splitId: split.id },
    });
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
    if (linkedUser?.id) {
      await notify(linkedUser.id, linkedUser.fcmToken, {
        title: 'New expense split',
        body: `${payerName} added "${expenseTitle || 'an expense'}" — you owe ₹${share}`,
        data: { type: 'SPLIT_CREATED', splitId: split.id },
      });
    }
  }
}

const list = async (req, res) => {
  await processDueRecurring(req.user.userId);

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
  const { amount, currency, title, note, expenseDate, categoryId, paymentTypeId, peopleIds = [], paidForPersonId, isRecurring, frequency, recurringStartAt, recurringEndDate } = req.body;

  const splitPeopleIds = paidForPersonId ? [] : peopleIds;

  let recurringExpenseId = null;
  if (isRecurring && frequency) {
    const firstRun = recurringStartAt
      ? new Date(recurringStartAt)
      : recurringNextDate(expenseDate || new Date(), frequency);
    const rec = await prisma.recurringExpense.create({
      data: {
        userId: req.user.userId,
        amount,
        currency: currency || 'INR',
        title,
        note,
        categoryId: categoryId || null,
        paymentTypeId,
        frequency,
        nextDueDate: firstRun,
        endDate: recurringEndDate ? new Date(recurringEndDate) : null,
      },
    });
    recurringExpenseId = rec.id;
  }

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
      recurringExpenseId,
      people: { create: splitPeopleIds.map((personId) => ({ personId })) },
    },
    include,
  });

  await syncSplits(expense.id, title, req.user.userId, Number(amount), splitPeopleIds, paidForPersonId || null);

  const full = await prisma.expense.findUnique({ where: { id: expense.id }, include });
  res.status(201).json(full);
  checkBudgetAlert(req.user.userId, categoryId).catch(() => {});
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
  checkBudgetAlert(req.user.userId, categoryId).catch(() => {});
};

const remove = async (req, res) => {
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

const analytics = async (req, res) => {
  const { fromDate, toDate } = req.query;
  const where = { userId: req.user.userId };
  if (fromDate || toDate) {
    where.expenseDate = {};
    if (fromDate) where.expenseDate.gte = new Date(fromDate);
    if (toDate) where.expenseDate.lte = new Date(toDate);
  }

  const expenses = await prisma.expense.findMany({
    where,
    select: {
      amount: true,
      title: true,
      expenseDate: true,
      paymentTypeId: true,
      paymentType: { select: { name: true, icon: true, color: true } },
      categoryId: true,
      category: { select: { name: true, icon: true, color: true } },
    },
  });

  const byPaymentType = {};
  const byCategory = {};
  const byDayMap = {};
  let total = 0;
  let topExpense = null;

  for (const e of expenses) {
    const amount = Number(e.amount);
    total += amount;

    if (!topExpense || amount > topExpense.amount) {
      topExpense = { title: e.title, amount, category: e.category };
    }

    const ptKey = e.paymentTypeId;
    if (!byPaymentType[ptKey]) {
      byPaymentType[ptKey] = { id: ptKey, name: e.paymentType?.name, icon: e.paymentType?.icon, color: e.paymentType?.color, total: 0, count: 0 };
    }
    byPaymentType[ptKey].total = Math.round((byPaymentType[ptKey].total + amount) * 100) / 100;
    byPaymentType[ptKey].count++;

    const catKey = e.categoryId || '__none__';
    if (!byCategory[catKey]) {
      byCategory[catKey] = { id: e.categoryId, name: e.category?.name || 'Uncategorised', icon: e.category?.icon || '📦', color: e.category?.color, total: 0, count: 0 };
    }
    byCategory[catKey].total = Math.round((byCategory[catKey].total + amount) * 100) / 100;
    byCategory[catKey].count++;

    const day = e.expenseDate.toISOString().slice(0, 10);
    byDayMap[day] = Math.round(((byDayMap[day] || 0) + amount) * 100) / 100;
  }

  const sort = (map) => Object.values(map).sort((a, b) => b.total - a.total);

  const byDay = Object.entries(byDayMap)
    .map(([date, t]) => ({ date, total: t }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const transactionCount = expenses.length;
  const avgPerTransaction = transactionCount > 0 ? Math.round((total / transactionCount) * 100) / 100 : 0;

  let daySpan = 1;
  if (fromDate && toDate) {
    daySpan = Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000));
  }
  const avgPerDay = Math.round((total / daySpan) * 100) / 100;

  res.json({
    total: Math.round(total * 100) / 100,
    transactionCount,
    avgPerTransaction,
    avgPerDay,
    byPaymentType: sort(byPaymentType),
    byCategory: sort(byCategory),
    byDay,
    topExpense,
  });
};

const trend = async (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const from = startOfMonth(d);
    const to = endOfMonth(d);

    const [sumResult, count] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId, expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.expense.count({
        where: { userId, expenseDate: { gte: from, lte: to } },
      }),
    ]);

    months.push({
      month: format(d, 'MMM'),
      fullMonth: format(d, 'MMM yyyy'),
      total: Math.round(Number(sumResult._sum.amount || 0) * 100) / 100,
      count,
      isCurrent: i === 0,
    });
  }

  res.json(months);
};

const uploadReceipt = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'hisabkitab/receipts' }, (err, data) => (err ? reject(err) : resolve(data)))
      .end(req.file.buffer);
  });

  const receiptUrl = result.secure_url.replace('/upload/', '/upload/w_1200,q_auto/');
  await prisma.expense.update({ where: { id: req.params.id }, data: { receiptUrl } });
  res.json({ receiptUrl });
};

const exportCsv = async (req, res) => {
  const { fromDate, toDate } = req.query;
  const where = { userId: req.user.userId };
  if (fromDate || toDate) {
    where.expenseDate = {};
    if (fromDate) where.expenseDate.gte = new Date(fromDate);
    if (toDate) where.expenseDate.lte = new Date(toDate);
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
    select: {
      expenseDate: true,
      title: true,
      amount: true,
      note: true,
      category: { select: { name: true } },
      paymentType: { select: { name: true } },
      paidForPerson: { select: { name: true } },
      group: { select: { name: true } },
    },
  });

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Date', 'Title', 'Category', 'Payment Type', 'Amount', 'Note', 'Paid For', 'Group'];
  const rows = expenses.map((e) => [
    esc(e.expenseDate.toISOString().slice(0, 10)),
    esc(e.title),
    esc(e.category?.name || ''),
    esc(e.paymentType?.name || ''),
    esc(Number(e.amount)),
    esc(e.note || ''),
    esc(e.paidForPerson?.name || ''),
    esc(e.group?.name || ''),
  ].join(','));

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRow = [esc(''), esc('TOTAL'), esc(''), esc(''), esc(Math.round(total * 100) / 100), esc(''), esc(''), esc('')].join(',');
  const csv = [headers.map(esc).join(','), ...rows, totalRow].join('\r\n');
  const filename = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

const importCsv = async (req, res) => {
  const { rows = [] } = req.body;
  const userId = req.user.userId;

  const [paymentTypes, categories] = await Promise.all([
    prisma.paymentType.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
  ]);

  const defaultPt = paymentTypes.find((p) => p.isDefault) || paymentTypes[0];
  if (!defaultPt) return res.status(400).json({ error: 'Please create at least one payment type first.' });

  let created = 0, skipped = 0;

  for (const row of rows) {
    const rawAmount = String(row.amount || '').replace(/[^0-9.]/g, '');
    const amount = Math.abs(parseFloat(rawAmount));
    if (!amount || isNaN(amount)) { skipped++; continue; }

    let expenseDate;
    try {
      expenseDate = new Date(row.expenseDate);
      if (isNaN(expenseDate.getTime())) throw new Error();
    } catch { skipped++; continue; }

    const cat = row.categoryName
      ? categories.find((c) => c.name.toLowerCase() === String(row.categoryName).toLowerCase())
      : null;
    const pt = row.paymentTypeName
      ? paymentTypes.find((p) => p.name.toLowerCase() === String(row.paymentTypeName).toLowerCase())
      : null;

    await prisma.expense.create({
      data: {
        userId,
        amount,
        title: row.title || null,
        note: row.note || null,
        expenseDate,
        categoryId: cat?.id || null,
        paymentTypeId: (pt || defaultPt).id,
      },
    });
    created++;
  }

  res.json({ message: `Imported ${created} expenses, ${skipped} skipped`, created, skipped });
};

module.exports = { list, create, getOne, update, remove, analytics, trend, exportCsv, uploadReceipt, importCsv };
