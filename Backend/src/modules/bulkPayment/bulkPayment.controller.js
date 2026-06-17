const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

// GET /bulk-payments — list sent and received
const list = async (req, res) => {
  const userId = req.user.userId;
  const [sent, received] = await Promise.all([
    prisma.bulkPayment.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: { select: { id: true, name: true, email: true, photoUrl: true } },
        splits: {
          include: {
            split: {
              include: { expense: { select: { id: true, title: true, amount: true, expenseDate: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bulkPayment.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { id: true, name: true, email: true, photoUrl: true } },
        splits: {
          include: {
            split: {
              include: { expense: { select: { id: true, title: true, amount: true, expenseDate: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({ sent, received });
};

// POST /bulk-payments — create a bulk payment request
const create = async (req, res) => {
  const fromUserId = req.user.userId;
  const { toUserId, splitIds, note } = req.body;

  if (!toUserId || !splitIds?.length) {
    return res.status(400).json({ error: 'toUserId and splitIds required' });
  }

  // Verify splits are ones the current user owes (they are the linked person on the split)
  const splits = await prisma.expenseSplit.findMany({
    where: {
      id: { in: splitIds },
      person: { linkedUserId: fromUserId },
      status: { in: ['PENDING', 'PAYMENT_REQUESTED'] },
    },
    include: { expense: { select: { title: true, amount: true } } },
  });

  if (splits.length !== splitIds.length) {
    return res.status(400).json({ error: 'Some splits not found or already settled' });
  }

  const totalAmount = splits.reduce((s, sp) => s + Number(sp.amount), 0);

  const bulkPayment = await prisma.bulkPayment.create({
    data: {
      fromUserId,
      toUserId,
      totalAmount,
      note: note || null,
      status: 'PENDING',
      splits: {
        create: splits.map((sp) => ({ splitId: sp.id })),
      },
    },
    include: {
      toUser: { select: { id: true, name: true, email: true, fcmToken: true } },
      splits: { include: { split: { include: { expense: true } } } },
    },
  });

  // Update each split status to PAYMENT_REQUESTED
  await prisma.expenseSplit.updateMany({
    where: { id: { in: splitIds } },
    data: { status: 'PAYMENT_REQUESTED' },
  });

  // Send FCM notification to payee
  {
    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true } });
    await notify(bulkPayment.toUserId, bulkPayment.toUser.fcmToken, {
      title: '💸 Bulk Payment Request',
      body: `${fromUser?.name || 'Someone'} wants to pay you ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} for ${splits.length} expense${splits.length !== 1 ? 's' : ''}`,
      data: { type: 'BULK_PAYMENT', bulkPaymentId: bulkPayment.id },
    });
  }

  res.status(201).json(bulkPayment);
};

// PATCH /bulk-payments/:id/respond — accept or reject
const respond = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { action } = req.body; // 'ACCEPTED' | 'REJECTED'

  if (!['ACCEPTED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ error: 'action must be ACCEPTED or REJECTED' });
  }

  const bp = await prisma.bulkPayment.findFirst({
    where: { id, toUserId: userId, status: 'PENDING' },
    include: {
      splits: {
        include: {
          split: {
            include: {
              person: { include: { linkedUser: { select: { id: true, fcmToken: true } } } },
              expense: {
                include: {
                  user: { select: { name: true } },
                  category: { select: { name: true } },
                  paymentType: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      fromUser: { select: { id: true, name: true, fcmToken: true } },
    },
  });

  if (!bp) return res.status(404).json({ error: 'Bulk payment not found or already responded' });

  const splitIds = bp.splits.map((s) => s.splitId);

  await prisma.$transaction(async (tx) => {
    await tx.bulkPayment.update({ where: { id }, data: { status: action } });

    if (action === 'ACCEPTED') {
      await tx.expenseSplit.updateMany({
        where: { id: { in: splitIds } },
        data: { status: 'CONFIRMED' },
      });
      // Decrement each original expense by the split amount
      for (const bps of bp.splits) {
        const split = bps.split;
        await tx.expense.update({
          where: { id: split.expenseId },
          data: { amount: { decrement: Number(split.amount) } },
        });
      }
    } else {
      // Rejected — revert splits back to PENDING
      await tx.expenseSplit.updateMany({
        where: { id: { in: splitIds } },
        data: { status: 'PENDING' },
      });
    }
  });

  // If ACCEPTED, create settlement expenses in payer's account
  if (action === 'ACCEPTED') {
    const payerLinkedId = bp.fromUser.id;
    const [matchedType, fallbackType] = await Promise.all([
      prisma.paymentType.findFirst({ where: { userId: payerLinkedId, name: 'Cash' } }),
      prisma.paymentType.findFirst({ where: { userId: payerLinkedId } }),
    ]);
    const paymentTypeId = matchedType?.id || fallbackType?.id;

    if (paymentTypeId) {
      const toUserName = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      for (const bps of bp.splits) {
        const split = bps.split;
        const origExpense = split.expense;
        const matchedCat = origExpense.category
          ? await prisma.category.findFirst({ where: { userId: payerLinkedId, name: origExpense.category.name } })
          : null;
        await prisma.expense.create({
          data: {
            userId: payerLinkedId,
            amount: Number(split.amount),
            currency: origExpense.currency || 'INR',
            title: origExpense.title ? `Split: ${origExpense.title}` : 'Split expense',
            note: `Bulk settled — paid to ${toUserName?.name || 'someone'}`,
            expenseDate: new Date(),
            categoryId: matchedCat?.id || null,
            paymentTypeId,
          },
        });
      }
    }
  }

  // Notify the payer
  {
    const toUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const verb = action === 'ACCEPTED' ? 'accepted' : 'rejected';
    await notify(bp.fromUser.id, bp.fromUser.fcmToken, {
      title: action === 'ACCEPTED' ? '✅ Payment Accepted' : '❌ Payment Rejected',
      body: `${toUser?.name || 'Someone'} ${verb} your bulk payment of ₹${Number(bp.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      data: { type: 'BULK_PAYMENT_RESPONSE', bulkPaymentId: id, action },
    });
  }

  res.json({ success: true, status: action });
};

// PATCH /bulk-payments/:id/cancel — payer cancels before response
const cancel = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const bp = await prisma.bulkPayment.findFirst({
    where: { id, fromUserId: userId, status: 'PENDING' },
    include: { splits: true },
  });

  if (!bp) return res.status(404).json({ error: 'Bulk payment not found or cannot be cancelled' });

  const splitIds = bp.splits.map((s) => s.splitId);

  await prisma.$transaction(async (tx) => {
    await tx.bulkPayment.update({ where: { id }, data: { status: 'CANCELLED' } });
    await tx.expenseSplit.updateMany({
      where: { id: { in: splitIds } },
      data: { status: 'PENDING' },
    });
  });

  res.json({ success: true });
};

module.exports = { list, create, respond, cancel };
