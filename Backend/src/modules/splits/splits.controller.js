const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

const ACTIVE = ['PENDING', 'PAYMENT_REQUESTED'];

const getBalances = async (req, res) => {
  const myId = req.user.userId;

  const [owedToMeSplits, iOweSplits] = await Promise.all([
    // Others owe me: I paid the expense
    prisma.expenseSplit.findMany({
      where: { expense: { userId: myId }, status: { in: ACTIVE } },
      include: {
        person: true,
        expense: { select: { id: true, title: true, amount: true, expenseDate: true, currency: true } },
        paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // I owe others: I'm the linked person on the split
    prisma.expenseSplit.findMany({
      where: { person: { linkedUserId: myId }, status: { in: ACTIVE } },
      include: {
        person: true,
        expense: { select: { id: true, title: true, amount: true, expenseDate: true, currency: true, userId: true, user: { select: { id: true, name: true, email: true } } } },
        paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Group owedToMe by person
  const owedMap = {};
  for (const split of owedToMeSplits) {
    const key = split.personId;
    if (!owedMap[key]) {
      owedMap[key] = {
        personId: split.personId,
        personName: split.person.name,
        personEmail: split.person.email,
        linkedUserId: split.person.linkedUserId,
        total: 0,
        splits: [],
      };
    }
    owedMap[key].total = Math.round((owedMap[key].total + Number(split.amount)) * 100) / 100;
    owedMap[key].splits.push(split);
  }

  // Group iOwe by payer
  const iOweMap = {};
  for (const split of iOweSplits) {
    const payer = split.expense.user;
    const key = payer.id;
    if (!iOweMap[key]) {
      iOweMap[key] = {
        payerUserId: payer.id,
        payerName: payer.name,
        payerEmail: payer.email,
        total: 0,
        splits: [],
      };
    }
    iOweMap[key].total = Math.round((iOweMap[key].total + Number(split.amount)) * 100) / 100;
    iOweMap[key].splits.push(split);
  }

  res.json({
    owedToMe: Object.values(owedMap),
    iOwe: Object.values(iOweMap),
  });

  // Fire-and-forget: nudge if any split has been PENDING > 7 days
  checkSettleReminder(myId, iOweSplits).catch(() => {});
};

async function checkSettleReminder(userId, iOweSplits) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const old = iOweSplits.filter((s) => s.status === 'PENDING' && new Date(s.createdAt) < sevenDaysAgo);
  if (!old.length) return;

  // Only send once per week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { userId, type: 'SETTLE_REMINDER', createdAt: { gte: weekAgo } },
  });
  if (existing) return;

  const total = old.reduce((s, sp) => s + Number(sp.amount), 0);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
  await notify(userId, user?.fcmToken, {
    title: '⏰ Pending settlements',
    body: `You have ₹${Math.round(total)} in splits pending for over a week. Don't forget to settle up!`,
    data: { type: 'SETTLE_REMINDER' },
  });
}

const requestPayment = async (req, res) => {
  const { splitId } = req.params;
  const { note } = req.body;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: true,
      expense: { include: { user: { select: { id: true, name: true, fcmToken: true } } } },
    },
  });

  if (!split) return res.status(404).json({ error: 'Split not found' });
  if (split.person.linkedUserId !== myId) return res.status(403).json({ error: 'Not your split' });
  if (split.status === 'CONFIRMED') return res.status(400).json({ error: 'Already confirmed' });

  await prisma.$transaction([
    prisma.paymentRequest.create({ data: { splitId, note: note || null } }),
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'PAYMENT_REQUESTED' } }),
  ]);

  const payer = split.expense.user;
  await notify(payer.id, payer.fcmToken, {
    title: 'Payment claim received',
    body: `${split.person.name} says they paid ₹${split.amount} for "${split.expense.title || 'an expense'}"`,
    data: { type: 'PAYMENT_REQUESTED', splitId },
  });

  res.json({ ok: true });
};

const acceptPayment = async (req, res) => {
  const { splitId } = req.params;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: { include: { linkedUser: { select: { id: true, fcmToken: true } } } },
      expense: {
        include: {
          user: { select: { name: true } },
          category: { select: { name: true } },
          paymentType: { select: { name: true } },
          paidForPerson: { select: { id: true } },
        },
      },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!split) return res.status(404).json({ error: 'Split not found' });
  if (split.expense.userId !== myId) return res.status(403).json({ error: 'Not your expense' });
  if (split.status !== 'PAYMENT_REQUESTED') return res.status(400).json({ error: 'No pending payment request' });

  const latestRequest = split.paymentRequests[0];
  const linkedUserId = split.person.linkedUser?.id;

  const splitAmount = Number(split.amount);

  // Confirm the split (no decrement — reimbursement expense created below instead)
  await prisma.$transaction([
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'CONFIRMED' } }),
    ...(latestRequest
      ? [prisma.paymentRequest.update({ where: { id: latestRequest.id }, data: { status: 'ACCEPTED' } })]
      : []),
  ]);

  // Create reimbursement expense for payer (B) — visible in their list as +money back
  const origExpense = split.expense;
  const payerUserId = origExpense.userId;
  const paymentTypeId = origExpense.paymentTypeId ||
    (await prisma.paymentType.findFirst({ where: { userId: payerUserId } }))?.id;
  if (paymentTypeId) {
    await prisma.expense.create({
      data: {
        userId: payerUserId,
        amount: splitAmount,
        currency: origExpense.currency || 'INR',
        title: `Reimbursement: ${origExpense.title || 'Expense'}`,
        note: `${split.person.name || split.person.email} paid back their share`,
        expenseDate: new Date(),
        categoryId: origExpense.categoryId || null,
        paymentTypeId,
        isReimbursement: true,
      },
    });
  }

  // Create expense in the debtor's account (A) so it shows on their list
  if (linkedUserId) {
    const isPaidFor = origExpense.paidForPersonId === split.personId;

    const [matchedCat, matchedType, fallbackType] = await Promise.all([
      origExpense.category
        ? prisma.category.findFirst({ where: { userId: linkedUserId, name: origExpense.category.name } })
        : null,
      origExpense.paymentType
        ? prisma.paymentType.findFirst({ where: { userId: linkedUserId, name: origExpense.paymentType.name } })
        : null,
      prisma.paymentType.findFirst({ where: { userId: linkedUserId } }),
    ]);

    const debtorPaymentTypeId = matchedType?.id || fallbackType?.id;

    if (debtorPaymentTypeId) {
      const expenseTitle = isPaidFor
        ? origExpense.title || 'Expense'
        : origExpense.title ? `Split: ${origExpense.title}` : 'Split expense';

      await prisma.expense.create({
        data: {
          userId: linkedUserId,
          amount: splitAmount,
          currency: origExpense.currency || 'INR',
          title: expenseTitle,
          note: `Settled — paid to ${origExpense.user?.name || 'someone'}`,
          expenseDate: new Date(),
          categoryId: matchedCat?.id || null,
          paymentTypeId: debtorPaymentTypeId,
        },
      });
    }
  }

  await notify(linkedUserId, split.person.linkedUser?.fcmToken, {
    title: 'Payment confirmed!',
    body: `Your payment of ₹${splitAmount} for "${split.expense.title || 'an expense'}" was accepted`,
    data: { type: 'PAYMENT_ACCEPTED', splitId },
  });

  res.json({ ok: true });
};

const rejectPayment = async (req, res) => {
  const { splitId } = req.params;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: { include: { linkedUser: { select: { id: true, fcmToken: true } } } },
      expense: { select: { userId: true, title: true } },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!split) return res.status(404).json({ error: 'Split not found' });
  if (split.expense.userId !== myId) return res.status(403).json({ error: 'Not your expense' });
  if (split.status !== 'PAYMENT_REQUESTED') return res.status(400).json({ error: 'No pending payment request' });

  const latestRequest = split.paymentRequests[0];

  await prisma.$transaction([
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'PENDING' } }),
    ...(latestRequest
      ? [prisma.paymentRequest.update({ where: { id: latestRequest.id }, data: { status: 'REJECTED' } })]
      : []),
  ]);

  await notify(split.person.linkedUser?.id, split.person.linkedUser?.fcmToken, {
    title: 'Payment rejected',
    body: `Your payment claim for "${split.expense.title || 'an expense'}" was rejected. ₹${split.amount} is still pending`,
    data: { type: 'PAYMENT_REJECTED', splitId },
  });

  res.json({ ok: true });
};

const getPaidForSummary = async (req, res) => {
  const myId = req.user.userId;

  const expenses = await prisma.expense.findMany({
    where: { userId: myId, paidForPersonId: { not: null } },
    include: {
      paidForPerson: true,
      splits: {
        include: { paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: { expenseDate: 'desc' },
  });

  const personMap = {};
  for (const expense of expenses) {
    const person = expense.paidForPerson;
    if (!person) continue;
    const split = expense.splits[0];
    const status = split?.status || 'PENDING';
    if (!personMap[person.id]) {
      personMap[person.id] = {
        personId: person.id,
        personName: person.name,
        personEmail: person.email,
        linkedUserId: person.linkedUserId,
        totalOutstanding: 0,
        totalSettled: 0,
        expenseCount: 0,
      };
    }
    const amount = Number(expense.amount);
    if (status === 'CONFIRMED') {
      personMap[person.id].totalSettled = Math.round((personMap[person.id].totalSettled + amount) * 100) / 100;
    } else {
      personMap[person.id].totalOutstanding = Math.round((personMap[person.id].totalOutstanding + amount) * 100) / 100;
    }
    personMap[person.id].expenseCount += 1;
  }

  res.json(Object.values(personMap));
};

const getPaidForPerson = async (req, res) => {
  const myId = req.user.userId;
  const { personId } = req.params;

  const expenses = await prisma.expense.findMany({
    where: { userId: myId, paidForPersonId: personId },
    include: {
      paidForPerson: true,
      category: true,
      splits: {
        include: { paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: { expenseDate: 'desc' },
  });

  res.json(expenses);
};

const markReceived = async (req, res) => {
  const { splitId } = req.params;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: { include: { linkedUser: { select: { id: true, name: true, fcmToken: true } } } },
      expense: {
        include: {
          user: { select: { id: true, name: true } },
          category: { select: { name: true } },
          paymentType: { select: { name: true } },
          paidForPerson: { select: { id: true } },
        },
      },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!split) return res.status(404).json({ error: 'Split not found' });
  if (split.expense.userId !== myId) return res.status(403).json({ error: 'Not your expense' });
  if (split.status === 'CONFIRMED' || split.status === 'WAIVED') return res.status(400).json({ error: 'Already settled' });

  const latestRequest = split.paymentRequests[0];
  const linkedUserId = split.person.linkedUser?.id;
  const splitAmount = Number(split.amount);

  await prisma.$transaction([
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'CONFIRMED' } }),
    ...(latestRequest
      ? [prisma.paymentRequest.update({ where: { id: latestRequest.id }, data: { status: 'ACCEPTED' } })]
      : []),
  ]);

  // Create reimbursement expense for payer (B)
  const origExpense = split.expense;
  const payerUserId = origExpense.userId;
  const reimbursePaymentTypeId = origExpense.paymentTypeId ||
    (await prisma.paymentType.findFirst({ where: { userId: payerUserId } }))?.id;
  if (reimbursePaymentTypeId) {
    await prisma.expense.create({
      data: {
        userId: payerUserId,
        amount: splitAmount,
        currency: origExpense.currency || 'INR',
        title: `Reimbursement: ${origExpense.title || 'Expense'}`,
        note: `${split.person.name || split.person.email} paid back their share`,
        expenseDate: new Date(),
        categoryId: origExpense.categoryId || null,
        paymentTypeId: reimbursePaymentTypeId,
        isReimbursement: true,
      },
    });
  }

  // Create expense in the debtor's account so it appears on their home page
  if (linkedUserId) {
    const isPaidFor = origExpense.paidForPersonId === split.personId;

    const [matchedCat, matchedType, fallbackType] = await Promise.all([
      origExpense.category
        ? prisma.category.findFirst({ where: { userId: linkedUserId, name: origExpense.category.name } })
        : null,
      origExpense.paymentType
        ? prisma.paymentType.findFirst({ where: { userId: linkedUserId, name: origExpense.paymentType.name } })
        : null,
      prisma.paymentType.findFirst({ where: { userId: linkedUserId } }),
    ]);

    const debtorPaymentTypeId = matchedType?.id || fallbackType?.id;

    if (debtorPaymentTypeId) {
      const expenseTitle = isPaidFor
        ? origExpense.title || 'Expense'
        : origExpense.title ? `Split: ${origExpense.title}` : 'Split expense';

      await prisma.expense.create({
        data: {
          userId: linkedUserId,
          amount: splitAmount,
          currency: origExpense.currency || 'INR',
          title: expenseTitle,
          note: `Recorded by ${split.expense.user?.name || 'payer'}`,
          expenseDate: new Date(),
          categoryId: matchedCat?.id || null,
          paymentTypeId: debtorPaymentTypeId,
        },
      });
    }
  }

  await notify(linkedUserId, split.person.linkedUser?.fcmToken, {
    title: '✅ Payment recorded',
    body: `${split.expense.user?.name || 'Someone'} marked your ₹${splitAmount} for "${split.expense.title || 'an expense'}" as received`,
    data: { type: 'PAYMENT_ACCEPTED', splitId },
  });

  res.json({ ok: true });
};

const waiveSplit = async (req, res) => {
  const { splitId } = req.params;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: { include: { linkedUser: { select: { id: true, fcmToken: true } } } },
      expense: { select: { userId: true, title: true, amount: true } },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!split) return res.status(404).json({ error: 'Split not found' });
  if (split.expense.userId !== myId) return res.status(403).json({ error: 'Not your expense' });
  if (split.status === 'CONFIRMED') return res.status(400).json({ error: 'Already settled' });

  const latestRequest = split.paymentRequests[0];

  await prisma.$transaction([
    // Mark waived — does NOT decrement expense amount (absorbed into your spend)
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'WAIVED' } }),
    ...(latestRequest
      ? [prisma.paymentRequest.update({ where: { id: latestRequest.id }, data: { status: 'ACCEPTED' } })]
      : []),
  ]);

  // Notify the person their debt was forgiven
  await notify(split.person.linkedUser?.id, split.person.linkedUser?.fcmToken, {
    title: '🎁 Debt forgiven',
    body: `Your ₹${split.amount} for "${split.expense.title || 'an expense'}" has been waived off — you don't owe anything!`,
    data: { type: 'SPLIT_WAIVED', splitId },
  });

  res.json({ ok: true });
};

const getBalanceHistory = async (req, res) => {
  const myId = req.user.userId;
  const { personId } = req.params;

  const person = await prisma.person.findFirst({ where: { id: personId, userId: myId } });
  if (!person) return res.status(404).json({ error: 'Not found' });

  const splits = await prisma.expenseSplit.findMany({
    where: { expense: { userId: myId }, personId },
    include: { expense: { select: { title: true, expenseDate: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const events = [];
  for (const s of splits) {
    const label = s.expense.title || 'Expense';
    const amount = Number(s.amount);
    events.push({ date: s.createdAt, delta: amount, label: `Added "${label}"` });
    if (s.status === 'CONFIRMED' || s.status === 'WAIVED') {
      events.push({
        date: s.updatedAt,
        delta: -amount,
        label: s.status === 'CONFIRMED' ? `${person.name} settled "${label}"` : `Waived "${label}"`,
      });
    }
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  let running = 0;
  const timeline = events.map((e) => {
    running += e.delta;
    return { date: e.date, balance: Math.round(running * 100) / 100, label: e.label, delta: e.delta };
  });

  res.json({ person: { id: person.id, name: person.name }, timeline });
};

const markAllReceived = async (req, res) => {
  const myId = req.user.userId;
  const { personId } = req.params;

  const splits = await prisma.expenseSplit.findMany({
    where: { personId, status: { in: ['PENDING', 'PAYMENT_REQUESTED'] }, expense: { userId: myId } },
    include: {
      person: { include: { linkedUser: { select: { id: true, name: true, fcmToken: true } } } },
      expense: { include: { user: { select: { id: true, name: true } } } },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!splits.length) return res.status(404).json({ error: 'No pending splits found' });

  const totalAmount = Math.round(splits.reduce((s, sp) => s + Number(sp.amount), 0) * 100) / 100;
  const linkedUserId = splits[0].person.linkedUser?.id;
  const personName = splits[0].person.name || splits[0].person.email || 'Someone';
  const payerName = splits[0].expense.user?.name || 'Someone';

  await prisma.$transaction([
    ...splits.map((sp) => prisma.expenseSplit.update({ where: { id: sp.id }, data: { status: 'CONFIRMED' } })),
    ...splits.flatMap((sp) => {
      const lr = sp.paymentRequests[0];
      return lr ? [prisma.paymentRequest.update({ where: { id: lr.id }, data: { status: 'ACCEPTED' } })] : [];
    }),
  ]);

  // Consolidated reimbursement for me (B)
  const myPaymentType = await prisma.paymentType.findFirst({ where: { userId: myId } });
  if (myPaymentType) {
    await prisma.expense.create({
      data: {
        userId: myId,
        amount: totalAmount,
        currency: 'INR',
        title: `Reimbursement from ${personName}`,
        note: `${splits.length} expense${splits.length > 1 ? 's' : ''} settled at once`,
        expenseDate: new Date(),
        paymentTypeId: myPaymentType.id,
        isReimbursement: true,
      },
    });
  }

  // Consolidated expense for A (if linked user)
  if (linkedUserId) {
    const fallbackType = await prisma.paymentType.findFirst({ where: { userId: linkedUserId } });
    if (fallbackType) {
      await prisma.expense.create({
        data: {
          userId: linkedUserId,
          amount: totalAmount,
          currency: 'INR',
          title: `Settled with ${payerName}`,
          note: `${splits.length} expense${splits.length > 1 ? 's' : ''} settled at once`,
          expenseDate: new Date(),
          paymentTypeId: fallbackType.id,
        },
      });
    }
    await notify(linkedUserId, splits[0].person.linkedUser?.fcmToken, {
      title: '✅ All splits settled!',
      body: `${payerName} marked all your splits (₹${totalAmount}) as received`,
      data: { type: 'PAYMENT_ACCEPTED' },
    });
  }

  res.json({ settled: splits.length, totalAmount });
};

module.exports = { getBalances, requestPayment, acceptPayment, rejectPayment, waiveSplit, markReceived, markAllReceived, getPaidForSummary, getPaidForPerson, getBalanceHistory };
