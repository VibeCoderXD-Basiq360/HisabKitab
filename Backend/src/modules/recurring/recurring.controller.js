const { addDays, addWeeks, addMonths, addYears } = require('date-fns');
const prisma = require('../../lib/prisma');

function nextDate(from, frequency) {
  const base = new Date(from);
  switch (frequency) {
    case 'DAILY':   return addDays(base, 1);
    case 'WEEKLY':  return addWeeks(base, 1);
    case 'MONTHLY': return addMonths(base, 1);
    case 'YEARLY':  return addYears(base, 1);
    default:        return addMonths(base, 1);
  }
}

async function processDueRecurring(userId) {
  const now = new Date();
  const due = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true, nextDueDate: { lte: now } },
  });

  for (const rec of due) {
    const toCreate = [];
    let cursor = new Date(rec.nextDueDate);
    const endDate = rec.endDate ? new Date(rec.endDate) : null;

    while (cursor <= now) {
      if (endDate && cursor > endDate) break;
      toCreate.push({
        userId,
        amount: rec.amount,
        currency: rec.currency,
        title: rec.title,
        note: rec.note,
        categoryId: rec.categoryId,
        paymentTypeId: rec.paymentTypeId,
        expenseDate: new Date(cursor),
        recurringExpenseId: rec.id,
      });
      cursor = nextDate(cursor, rec.frequency);
    }

    if (toCreate.length > 0) {
      await prisma.expense.createMany({ data: toCreate });
    }

    const updates = { nextDueDate: cursor };
    if (endDate && cursor > endDate) updates.isActive = false;

    await prisma.recurringExpense.update({ where: { id: rec.id }, data: updates });
  }
}

const list = async (req, res) => {
  const items = await prisma.recurringExpense.findMany({
    where: { userId: req.user.userId },
    include: { category: true, paymentType: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
};

const create = async (req, res) => {
  const { amount, currency, title, note, categoryId, paymentTypeId, frequency, startDate, nextRunAt, endDate } = req.body;

  const firstDate = nextRunAt
    ? new Date(nextRunAt)
    : nextDate(new Date(startDate || new Date()), frequency);

  const item = await prisma.recurringExpense.create({
    data: {
      userId: req.user.userId,
      amount,
      currency: currency || 'INR',
      title,
      note,
      categoryId: categoryId || null,
      paymentTypeId,
      frequency,
      nextDueDate: firstDate,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { category: true, paymentType: true },
  });

  res.status(201).json(item);
};

const update = async (req, res) => {
  const existing = await prisma.recurringExpense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { amount, currency, title, note, categoryId, paymentTypeId, frequency, isActive, nextDueDate, endDate } = req.body;

  const item = await prisma.recurringExpense.update({
    where: { id: req.params.id },
    data: {
      ...(amount !== undefined && { amount }),
      ...(currency !== undefined && { currency }),
      ...(title !== undefined && { title }),
      ...(note !== undefined && { note }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(paymentTypeId !== undefined && { paymentTypeId }),
      ...(frequency !== undefined && { frequency }),
      ...(isActive !== undefined && { isActive }),
      ...(nextDueDate !== undefined && { nextDueDate: new Date(nextDueDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: { category: true, paymentType: true },
  });

  res.json(item);
};

const remove = async (req, res) => {
  const existing = await prisma.recurringExpense.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.recurringExpense.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, create, update, remove, processDueRecurring };
