const prisma = require('../../lib/prisma');
const { sendNotification } = require('../../lib/notify');

const ACTIVE = ['PENDING', 'PAYMENT_REQUESTED'];

const getBalances = async (req, res) => {
  const myId = req.user.userId;

  const [owedToMeSplits, iOweSplits] = await Promise.all([
    // Others owe me: I paid the expense
    prisma.expenseSplit.findMany({
      where: { expense: { userId: myId }, status: { in: ACTIVE } },
      include: {
        person: true,
        expense: true,
        paymentRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // I owe others: I'm the linked person on the split
    prisma.expenseSplit.findMany({
      where: { person: { linkedUserId: myId }, status: { in: ACTIVE } },
      include: {
        person: true,
        expense: { include: { user: { select: { id: true, name: true, email: true } } } },
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
};

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
  if (payer.fcmToken) {
    await sendNotification(payer.fcmToken, {
      title: 'Payment claim received',
      body: `${split.person.name} says they paid ₹${split.amount} for "${split.expense.title || 'an expense'}"`,
      data: { type: 'PAYMENT_REQUESTED', splitId },
    });
  }

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

  // Confirm the split + reduce original expense amount
  await prisma.$transaction([
    prisma.expenseSplit.update({ where: { id: splitId }, data: { status: 'CONFIRMED' } }),
    prisma.expense.update({
      where: { id: split.expenseId },
      data: { amount: { decrement: splitAmount } },
    }),
    ...(latestRequest
      ? [prisma.paymentRequest.update({ where: { id: latestRequest.id }, data: { status: 'ACCEPTED' } })]
      : []),
  ]);

  // Create a real expense in the ower's account so it shows on their home page
  if (linkedUserId) {
    const origExpense = split.expense;
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

    const paymentTypeId = matchedType?.id || fallbackType?.id;

    if (paymentTypeId) {
      const expenseTitle = isPaidFor
        ? origExpense.title || 'Expense'
        : origExpense.title ? `Split: ${origExpense.title}` : 'Split expense';
      const expenseNote = `Settled — paid to ${origExpense.user?.name || 'someone'}`;

      await prisma.expense.create({
        data: {
          userId: linkedUserId,
          amount: splitAmount,
          currency: origExpense.currency || 'INR',
          title: expenseTitle,
          note: expenseNote,
          expenseDate: new Date(),
          categoryId: matchedCat?.id || null,
          paymentTypeId,
        },
      });
    }
  }

  const fcmToken = split.person.linkedUser?.fcmToken;
  if (fcmToken) {
    await sendNotification(fcmToken, {
      title: 'Payment confirmed!',
      body: `Your payment of ₹${splitAmount} for "${split.expense.title || 'an expense'}" was accepted`,
      data: { type: 'PAYMENT_ACCEPTED', splitId },
    });
  }

  res.json({ ok: true });
};

const rejectPayment = async (req, res) => {
  const { splitId } = req.params;
  const myId = req.user.userId;

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      person: { include: { linkedUser: { select: { fcmToken: true } } } },
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

  const fcmToken = split.person.linkedUser?.fcmToken;
  if (fcmToken) {
    await sendNotification(fcmToken, {
      title: 'Payment rejected',
      body: `Your payment claim for "${split.expense.title || 'an expense'}" was rejected. ₹${split.amount} is still pending`,
      data: { type: 'PAYMENT_REJECTED', splitId },
    });
  }

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

module.exports = { getBalances, requestPayment, acceptPayment, rejectPayment, getPaidForSummary, getPaidForPerson };
