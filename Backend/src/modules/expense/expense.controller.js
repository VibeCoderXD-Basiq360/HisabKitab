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
  tabEntry: { select: { id: true, tab: { select: { id: true, name: true } } } },
  tabSettlement: { select: { id: true, tab: { select: { id: true, name: true } } } },
  splits: {
    include: {
      person: true,
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  },
  comments: { orderBy: { createdAt: 'asc' } },
  items:    { orderBy: { order: 'asc' } },
};

async function syncSplits(expenseId, expenseTitle, payerId, amount, peopleIds, paidForPersonId, customSplitAmount = null) {
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

  const share = customSplitAmount !== null
    ? Math.round(customSplitAmount * 100) / 100
    : Math.round((amount / (peopleIds.length + 1)) * 100) / 100;

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

async function linkDelegation(expenseId, paymentTypeId, userId, title, amount) {
  const delegation = await prisma.cardDelegation.findFirst({
    where: { paymentTypeId, requestedById: userId, status: 'ACTIVE' },
    include: { owner: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!delegation) return;

  await prisma.expense.update({
    where: { id: expenseId },
    data: { delegationId: delegation.id, isDelegatedCard: true },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(delegation.ownerId, delegation.owner.fcmToken, {
    title: `New charge on your card`,
    body: `${me?.name || 'Card user'} spent ₹${Number(amount).toLocaleString('en-IN')} on "${title || 'an expense'}"`,
    data: { type: 'CARD_EXPENSE_LOGGED', delegationId: delegation.id, expenseId },
  });
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
  const { amount: rawAmount, currency, title, note, expenseDate, categoryId, paymentTypeId, peopleIds = [], paidForPersonId, isRecurring, frequency, recurringStartAt, recurringEndDate, tags = [], isReimbursement = false, splitAmount, tabId, accountId, items = [] } = req.body;

  // If items provided, auto-compute total from their sum
  const amount = items.length > 0
    ? items.reduce((s, i) => s + Number(i.amount || 0), 0)
    : rawAmount;

  const splitPeopleIds = paidForPersonId ? [] : peopleIds;

  // Snapshot exchange rate at time of creation
  let rateAtTime = null;
  if (currency && currency !== 'INR') {
    const er = await prisma.exchangeRate.findFirst({
      where: { userId: req.user.userId, fromCurrency: currency.toUpperCase(), toCurrency: 'INR' },
      select: { rate: true },
    });
    if (er) rateAtTime = Number(er.rate);
  }

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
      rateAtTime,
      title,
      note,
      expenseDate: new Date(expenseDate),
      categoryId: categoryId || null,
      paymentTypeId,
      paidForPersonId: paidForPersonId || null,
      recurringExpenseId,
      tags: Array.isArray(tags) ? tags : [],
      isReimbursement: !!isReimbursement,
      accountId: accountId || null,
      people: { create: splitPeopleIds.map((personId) => ({ personId })) },
      items: items.length > 0
        ? { create: items.map((it, idx) => ({ name: it.name, amount: Number(it.amount), qty: it.qty || null, unit: it.unit || null, order: idx })) }
        : undefined,
    },
    include,
  });

  await syncSplits(expense.id, title, req.user.userId, Number(amount), splitPeopleIds, paidForPersonId || null, splitAmount != null ? Number(splitAmount) : null);

  await linkDelegation(expense.id, paymentTypeId, req.user.userId, title, amount);

  if (tabId) {
    try {
      const tab = await prisma.sharedTab.findFirst({
        where: { id: tabId },
        include: { members: true },
      });
      if (tab) {
        const isMultiMember = tab.memberId === null;
        let splitType = 'SPLIT';
        let splitRatio = 50;
        if (paidForPersonId) {
          splitType = 'THEIRS_ONLY';
          splitRatio = 100;
        } else if (splitPeopleIds.length > 0 && splitAmount != null) {
          splitRatio = Math.min(99, Math.max(1, Math.round((Number(splitAmount) / Number(amount)) * 100)));
        }
        let categoryName = null;
        if (categoryId) {
          const cat = await prisma.expenseCategory.findUnique({ where: { id: categoryId }, select: { name: true } });
          categoryName = cat?.name || null;
        }
        const tabEntry = await prisma.tabEntry.create({
          data: {
            tabId,
            paidById: req.user.userId,
            amount: Number(amount),
            description: title,
            date: new Date(expenseDate),
            splitType,
            splitRatio,
            category: categoryName,
            note: note || null,
          },
        });
        await prisma.expense.update({ where: { id: expense.id }, data: { tabEntryId: tabEntry.id } });
        if (isMultiMember) {
          const perShare = Math.round((Number(amount) / tab.members.length) * 100) / 100;
          for (const m of tab.members) {
            if (m.userId === req.user.userId) continue;
            await prisma.expense.create({
              data: { userId: m.userId, amount: perShare, title, note: `From "${tab.name}" tab`, expenseDate: new Date(expenseDate), tabEntryId: tabEntry.id },
            });
          }
        } else {
          const otherUserId = tab.creatorId === req.user.userId ? tab.memberId : tab.creatorId;
          if (otherUserId) {
            const otherShare = splitType === 'MINE_ONLY' ? 0
              : splitType === 'THEIRS_ONLY' ? Number(amount)
              : Math.round(Number(amount) * (splitRatio / 100) * 100) / 100;
            if (otherShare > 0) {
              await prisma.expense.create({
                data: { userId: otherUserId, amount: otherShare, title, note: `From "${tab.name}" tab`, expenseDate: new Date(expenseDate), tabEntryId: tabEntry.id },
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Tab linking failed:', err.message);
    }
  }

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

  const { amount: rawAmount, currency, title, note, expenseDate, categoryId, paymentTypeId, peopleIds = [], paidForPersonId, tags = [], isReimbursement, items } = req.body;

  const amount = Array.isArray(items) && items.length > 0
    ? items.reduce((s, i) => s + Number(i.amount || 0), 0)
    : rawAmount;

  const splitPeopleIds = paidForPersonId ? [] : peopleIds;

  // Re-snapshot rate only if currency changed; keep existing rateAtTime otherwise
  let rateAtTime = existing.rateAtTime != null ? Number(existing.rateAtTime) : null;
  const newCurrency = currency || existing.currency;
  if (newCurrency === 'INR') {
    rateAtTime = null;
  } else if (newCurrency !== existing.currency) {
    const er = await prisma.exchangeRate.findFirst({
      where: { userId: req.user.userId, fromCurrency: newCurrency.toUpperCase(), toCurrency: 'INR' },
      select: { rate: true },
    });
    rateAtTime = er ? Number(er.rate) : null;
  }

  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      amount,
      currency,
      rateAtTime,
      title,
      note,
      expenseDate: new Date(expenseDate),
      categoryId: categoryId || null,
      paymentTypeId,
      paidForPersonId: paidForPersonId || null,
      tags: Array.isArray(tags) ? tags : [],
      ...(isReimbursement !== undefined && { isReimbursement: !!isReimbursement }),
      people: {
        deleteMany: {},
        create: splitPeopleIds.map((personId) => ({ personId })),
      },
      ...(Array.isArray(items) && {
        items: {
          deleteMany: {},
          create: items.length > 0
            ? items.map((it, idx) => ({ name: it.name, amount: Number(it.amount), qty: it.qty || null, unit: it.unit || null, order: idx }))
            : [],
        },
      }),
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
    include: {
      tabEntry: { select: { tab: { select: { name: true } } } },
      tabSettlement: { select: { tab: { select: { name: true } } } },
    },
  });
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  if (existing.tabEntryId) {
    const tabName = existing.tabEntry?.tab?.name || 'Shared Tab';
    return res.status(403).json({
      error: `This expense was auto-created from "${tabName}". Delete the entry from the tab instead.`,
      tabEntryId: existing.tabEntryId,
    });
  }

  if (existing.tabSettlementId) {
    const tabName = existing.tabSettlement?.tab?.name || 'Shared Tab';
    return res.status(403).json({
      error: `This reimbursement was auto-created from a "${tabName}" settlement. Remove the settlement from the tab instead.`,
      tabSettlementId: existing.tabSettlementId,
    });
  }

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
      isReimbursement: true,
      tabEntryId: true,
      tabSettlementId: true,
    },
  });

  const byPaymentType = {};
  const byCategory = {};
  const byDayMap = {};
  let total = 0;
  let topExpense = null;
  let tabTotal = 0;
  let manualTotal = 0;
  let reimbursementTotal = 0;

  for (const e of expenses) {
    const amount = Number(e.amount);

    // Reimbursements are money coming back — excluded from main totals/charts
    if (e.isReimbursement) {
      reimbursementTotal = Math.round((reimbursementTotal + amount) * 100) / 100;
      continue;
    }

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

    if (e.tabEntryId) {
      tabTotal = Math.round((tabTotal + amount) * 100) / 100;
    } else {
      manualTotal = Math.round((manualTotal + amount) * 100) / 100;
    }

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
    bySource: { manual: manualTotal, tab: tabTotal, reimbursements: reimbursementTotal },
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
        where: { userId, expenseDate: { gte: from, lte: to }, isReimbursement: false },
        _sum: { amount: true },
      }),
      prisma.expense.count({
        where: { userId, expenseDate: { gte: from, lte: to }, isReimbursement: false },
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

const listTags = async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { userId: req.user.userId },
    select: { tags: true },
  });
  const all = new Set();
  for (const e of expenses) for (const t of (e.tags || [])) all.add(t);
  res.json([...all].sort());
};

const listComments = async (req, res) => {
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
    select: { id: true },
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  const comments = await prisma.expenseComment.findMany({
    where: { expenseId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(comments);
};

const createComment = async (req, res) => {
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
    select: { id: true },
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
  const comment = await prisma.expenseComment.create({
    data: { expenseId: req.params.id, userId: req.user.userId, userName: user?.name || 'You', text: text.trim() },
  });
  res.status(201).json(comment);
};

const deleteComment = async (req, res) => {
  const comment = await prisma.expenseComment.findFirst({
    where: { id: req.params.commentId, userId: req.user.userId },
  });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  await prisma.expenseComment.delete({ where: { id: req.params.commentId } });
  res.status(204).end();
};

const transfer = async (req, res) => {
  const { personId, transferType, customRatio, tabId } = req.body;
  if (!personId || !transferType) return res.status(400).json({ error: 'personId and transferType are required' });

  const expense = await prisma.expense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
    include: { category: true, splits: true },
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (expense.tabEntryId) return res.status(403).json({ error: 'Tab-linked expenses cannot be transferred. Manage from the tab instead.' });

  const person = await prisma.person.findFirst({
    where: { id: personId, userId: req.user.userId },
    include: { linkedUser: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!person) return res.status(404).json({ error: 'Person not found' });

  const amount = Number(expense.amount);
  let theirShare, splitType, splitRatio;
  if (transferType === 'FULL') {
    theirShare = amount; splitType = 'THEIRS_ONLY'; splitRatio = 100;
  } else if (transferType === 'SPLIT') {
    theirShare = Math.round((amount / 2) * 100) / 100; splitType = 'SPLIT'; splitRatio = 50;
  } else {
    const ratio = Math.min(99, Math.max(1, Number(customRatio) || 50));
    theirShare = Math.round(amount * (ratio / 100) * 100) / 100; splitType = 'SPLIT'; splitRatio = ratio;
  }

  // Replace any existing splits with the new one
  await prisma.expenseSplit.deleteMany({ where: { expenseId: expense.id } });
  await prisma.expense.update({ where: { id: expense.id }, data: { paidForPersonId: null } });
  await prisma.expenseSplit.create({ data: { expenseId: expense.id, personId, amount: theirShare } });

  // Create expense on the other person's account if they're a registered user
  let otherExpenseId = null;
  if (person.linkedUser?.id && theirShare > 0) {
    const payer = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
    const otherExp = await prisma.expense.create({
      data: {
        userId: person.linkedUser.id,
        amount: theirShare,
        title: expense.title,
        note: `Owed to ${payer?.name || 'someone'} — transferred expense`,
        expenseDate: expense.expenseDate,
        categoryId: expense.categoryId,
      },
    });
    otherExpenseId = otherExp.id;
    await notify(person.linkedUser.id, person.linkedUser.fcmToken, {
      title: 'Expense transferred to you',
      body: `${payer?.name || 'Someone'} transferred "${expense.title}" — you owe ₹${theirShare}`,
      data: { type: 'EXPENSE_TRANSFERRED', expenseId: otherExp.id },
    });
  }

  // Optionally link both expenses to a shared tab
  if (tabId) {
    try {
      const tab = await prisma.sharedTab.findFirst({ where: { id: tabId } });
      if (tab) {
        const tabEntry = await prisma.tabEntry.create({
          data: {
            tabId,
            paidById: req.user.userId,
            amount,
            description: expense.title,
            date: expense.expenseDate,
            splitType,
            splitRatio,
            category: expense.category?.name || null,
            note: expense.note || null,
          },
        });
        await prisma.expense.update({ where: { id: expense.id }, data: { tabEntryId: tabEntry.id } });
        if (otherExpenseId) {
          await prisma.expense.update({ where: { id: otherExpenseId }, data: { tabEntryId: tabEntry.id } });
        }
      }
    } catch (err) {
      console.error('Tab linking in transfer failed:', err.message);
    }
  }

  const full = await prisma.expense.findUnique({ where: { id: expense.id }, include });
  res.json(full);
};

module.exports = { list, create, getOne, update, remove, transfer, analytics, trend, exportCsv, uploadReceipt, importCsv, listTags, listComments, createComment, deleteComment };
