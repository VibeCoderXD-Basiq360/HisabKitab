const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

const delegationInclude = {
  paymentType:      { select: { id: true, name: true, icon: true, color: true, cardLastFour: true, cardHolderName: true, cardExpiry: true, billingCycleDay: true } },
  ownerPaymentType: { select: { id: true, name: true, icon: true, color: true, cardLastFour: true, cardHolderName: true, cardExpiry: true } },
  requestedBy: { select: { id: true, name: true, email: true, photoUrl: true } },
  owner:       { select: { id: true, name: true, email: true, photoUrl: true } },
};

// ─── Delegation CRUD ─────────────────────────────────────────────────────────

const list = async (req, res) => {
  const userId = req.user.userId;
  const [outgoing, incoming] = await Promise.all([
    prisma.cardDelegation.findMany({
      where: { requestedById: userId },
      include: delegationInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cardDelegation.findMany({
      where: { ownerId: userId },
      include: delegationInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({ outgoing, incoming });
};

const create = async (req, res) => {
  const { paymentTypeId, ownerEmail } = req.body;
  const userId = req.user.userId;

  const pt = await prisma.paymentType.findFirst({
    where: { id: paymentTypeId, userId, cardType: 'CREDIT_CARD' },
  });
  if (!pt) return res.status(404).json({ error: 'Credit card payment type not found' });

  const existing = await prisma.cardDelegation.findUnique({ where: { paymentTypeId } });
  if (existing && existing.status !== 'REVOKED') {
    return res.status(409).json({ error: 'This card already has an active or pending delegation' });
  }

  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, name: true, fcmToken: true },
  });
  if (!owner) return res.status(404).json({ error: 'No HisabKitab account found for that email' });
  if (owner.id === userId) return res.status(400).json({ error: 'Cannot delegate a card to yourself' });

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const delegation = await prisma.cardDelegation.create({
    data: { paymentTypeId, requestedById: userId, ownerId: owner.id, status: 'PENDING' },
    include: delegationInclude,
  });

  await notify(owner.id, owner.fcmToken, {
    title: 'Card delegation request',
    body: `${me?.name || 'Someone'} wants to link your card "${pt.name}" to log expenses — approve?`,
    data: { type: 'CARD_DELEGATION_REQUEST', delegationId: delegation.id },
  });

  res.status(201).json(delegation);
};

const approve = async (req, res) => {
  const userId = req.user.userId;
  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: req.params.id, ownerId: userId, status: 'PENDING' },
    include: { requestedBy: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!delegation) return res.status(404).json({ error: 'Pending delegation not found' });

  const updated = await prisma.cardDelegation.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE', approvedAt: new Date() },
    include: delegationInclude,
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(delegation.requestedById, delegation.requestedBy.fcmToken, {
    title: 'Card delegation approved',
    body: `${me?.name || 'Card owner'} approved your request — you can now log expenses on their card`,
    data: { type: 'CARD_DELEGATION_APPROVED', delegationId: delegation.id },
  });

  res.json(updated);
};

const reject = async (req, res) => {
  const userId = req.user.userId;
  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: req.params.id, ownerId: userId, status: 'PENDING' },
    include: { requestedBy: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!delegation) return res.status(404).json({ error: 'Pending delegation not found' });

  await prisma.cardDelegation.update({
    where: { id: req.params.id },
    data: { status: 'REVOKED' },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(delegation.requestedById, delegation.requestedBy.fcmToken, {
    title: 'Card delegation rejected',
    body: `${me?.name || 'Card owner'} rejected your delegation request`,
    data: { type: 'CARD_DELEGATION_REJECTED', delegationId: delegation.id },
  });

  res.json({ ok: true });
};

const revoke = async (req, res) => {
  const userId = req.user.userId;
  const delegation = await prisma.cardDelegation.findFirst({
    where: {
      id: req.params.id,
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ requestedById: userId }, { ownerId: userId }],
    },
    include: {
      requestedBy: { select: { id: true, name: true, fcmToken: true } },
      owner:       { select: { id: true, name: true, fcmToken: true } },
    },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  await prisma.cardDelegation.update({
    where: { id: req.params.id },
    data: { status: 'REVOKED' },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const otherUserId = userId === delegation.requestedById ? delegation.ownerId : delegation.requestedById;
  const otherFcm    = userId === delegation.requestedById ? delegation.owner.fcmToken : delegation.requestedBy.fcmToken;

  await notify(otherUserId, otherFcm, {
    title: 'Card delegation revoked',
    body: `${me?.name || 'Someone'} revoked the card delegation`,
    data: { type: 'CARD_DELEGATION_REVOKED', delegationId: delegation.id },
  });

  res.json({ ok: true });
};

// ─── Owner: view expenses on their card ──────────────────────────────────────

const getExpenses = async (req, res) => {
  const userId = req.user.userId;
  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: req.params.id, ownerId: userId, status: 'ACTIVE' },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const expenses = await prisma.expense.findMany({
    where: { delegationId: delegation.id },
    include: {
      category: true,
      paymentType: { select: { name: true, icon: true } },
    },
    orderBy: { expenseDate: 'desc' },
  });
  res.json(expenses);
};

// ─── Balance ─────────────────────────────────────────────────────────────────

const getBalance = async (req, res) => {
  const userId = req.user.userId;

  const [outgoing, incoming] = await Promise.all([
    // Cards I use (I am the requester) — what I owe the owner
    prisma.cardDelegation.findMany({
      where: { requestedById: userId, status: 'ACTIVE' },
      include: {
        owner: { select: { id: true, name: true, photoUrl: true } },
        paymentType: { select: { name: true, icon: true, color: true } },
        expenses: {
          where: { willRepay: true, isRepaid: false },
          select: { id: true, title: true, amount: true, expenseDate: true, isRepaid: true, willRepay: true },
        },
        repayments: {
          where: { status: 'PENDING_APPROVAL' },
          select: { id: true, amount: true, createdAt: true, status: true },
        },
      },
    }),
    // Cards I own (I am the owner) — what others owe me
    prisma.cardDelegation.findMany({
      where: { ownerId: userId, status: 'ACTIVE' },
      include: {
        requestedBy: { select: { id: true, name: true, photoUrl: true } },
        paymentType: { select: { name: true, icon: true, color: true } },
        expenses: {
          where: { willRepay: true, isRepaid: false },
          select: { id: true, title: true, amount: true, expenseDate: true, isRepaid: true, willRepay: true },
        },
        repayments: {
          where: { status: 'PENDING_APPROVAL' },
          select: { id: true, amount: true, createdAt: true, status: true },
        },
      },
    }),
  ]);

  const iOwe = outgoing.map((d) => ({
    delegationId: d.id,
    person: d.owner,
    card: d.paymentType,
    outstanding: d.expenses.reduce((s, e) => s + Number(e.amount), 0),
    pendingApproval: d.repayments.reduce((s, r) => s + Number(r.amount), 0),
    expenses: d.expenses,
    repayments: d.repayments,
  }));

  const owedToMe = incoming.map((d) => ({
    delegationId: d.id,
    person: d.requestedBy,
    card: d.paymentType,
    outstanding: d.expenses.reduce((s, e) => s + Number(e.amount), 0),
    pendingApproval: d.repayments.reduce((s, r) => s + Number(r.amount), 0),
    expenses: d.expenses,
    repayments: d.repayments,
  }));

  res.json({ iOwe, owedToMe });
};

// ─── Repayments ──────────────────────────────────────────────────────────────

const createRepayment = async (req, res) => {
  const userId = req.user.userId;
  const { expenseIds = [], note } = req.body;

  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: req.params.id, requestedById: userId, status: 'ACTIVE' },
    include: { owner: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, delegationId: delegation.id, willRepay: true, isRepaid: false },
    select: { id: true, amount: true, title: true },
  });
  if (!expenses.length) return res.status(400).json({ error: 'No valid expenses to repay' });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const repayment = await prisma.cardRepayment.create({
    data: {
      delegationId: delegation.id,
      payerId: userId,
      amount: total,
      note: note || null,
      expenseIds: expenses.map((e) => e.id),
      status: 'PENDING_APPROVAL',
    },
  });

  await notify(delegation.ownerId, delegation.owner.fcmToken, {
    title: 'Payment claim received',
    body: `${me?.name || 'Card user'} says they paid ₹${total.toLocaleString('en-IN')} — approve to confirm`,
    data: { type: 'CARD_REPAYMENT_CLAIM', repaymentId: repayment.id, delegationId: delegation.id },
  });

  res.status(201).json(repayment);
};

const approveRepayment = async (req, res) => {
  const userId = req.user.userId;
  const { id: delegationId, repaymentId } = req.params;

  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: delegationId, ownerId: userId, status: 'ACTIVE' },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const repayment = await prisma.cardRepayment.findFirst({
    where: { id: repaymentId, delegationId, status: 'PENDING_APPROVAL' },
    include: { payer: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!repayment) return res.status(404).json({ error: 'Pending repayment not found' });

  await prisma.$transaction([
    prisma.cardRepayment.update({
      where: { id: repaymentId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    }),
    prisma.expense.updateMany({
      where: { id: { in: repayment.expenseIds } },
      data: { isRepaid: true },
    }),
  ]);

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(repayment.payerId, repayment.payer.fcmToken, {
    title: 'Repayment confirmed',
    body: `${me?.name || 'Card owner'} confirmed your payment of ₹${Number(repayment.amount).toLocaleString('en-IN')}`,
    data: { type: 'CARD_REPAYMENT_APPROVED', repaymentId, delegationId },
  });

  res.json({ ok: true });
};

const rejectRepayment = async (req, res) => {
  const userId = req.user.userId;
  const { id: delegationId, repaymentId } = req.params;

  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: delegationId, ownerId: userId, status: 'ACTIVE' },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const repayment = await prisma.cardRepayment.findFirst({
    where: { id: repaymentId, delegationId, status: 'PENDING_APPROVAL' },
    include: { payer: { select: { id: true, name: true, fcmToken: true } } },
  });
  if (!repayment) return res.status(404).json({ error: 'Pending repayment not found' });

  await prisma.cardRepayment.update({
    where: { id: repaymentId },
    data: { status: 'REJECTED' },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(repayment.payerId, repayment.payer.fcmToken, {
    title: 'Repayment rejected',
    body: `${me?.name || 'Card owner'} did not confirm your payment of ₹${Number(repayment.amount).toLocaleString('en-IN')}`,
    data: { type: 'CARD_REPAYMENT_REJECTED', repaymentId, delegationId },
  });

  res.json({ ok: true });
};

// ─── Toggle willRepay on a delegated expense ─────────────────────────────────

const toggleWillRepay = async (req, res) => {
  const userId = req.user.userId;
  const expense = await prisma.expense.findFirst({
    where: { id: req.params.expenseId, userId, isDelegatedCard: true },
  });
  if (!expense) return res.status(404).json({ error: 'Delegated expense not found' });
  if (expense.isRepaid) return res.status(400).json({ error: 'Expense already repaid' });

  const updated = await prisma.expense.update({
    where: { id: req.params.expenseId },
    data: { willRepay: !expense.willRepay },
  });
  res.json(updated);
};

// ─── Owner: link their own card to the delegation ────────────────────────────

const linkOwnerCard = async (req, res) => {
  const { ownerPaymentTypeId } = req.body;
  const userId = req.user.userId;

  const delegation = await prisma.cardDelegation.findFirst({
    where: { id: req.params.id, ownerId: userId, status: 'ACTIVE' },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const pt = await prisma.paymentType.findFirst({
    where: { id: ownerPaymentTypeId, userId, cardType: 'CREDIT_CARD' },
  });
  if (!pt) return res.status(404).json({ error: 'Credit card not found in your payment types' });

  const updated = await prisma.cardDelegation.update({
    where: { id: req.params.id },
    data: { ownerPaymentTypeId },
    include: delegationInclude,
  });
  res.json(updated);
};

// ─── Combined bill for current billing cycle ─────────────────────────────────

const getCombinedBill = async (req, res) => {
  const userId = req.user.userId;

  const delegation = await prisma.cardDelegation.findFirst({
    where: {
      id: req.params.id,
      status: 'ACTIVE',
      OR: [{ requestedById: userId }, { ownerId: userId }],
    },
    include: {
      paymentType: { select: { billingCycleDay: true, cardLastFour: true, cardHolderName: true, cardExpiry: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
      owner:       { select: { id: true, name: true } },
    },
  });
  if (!delegation) return res.status(404).json({ error: 'Active delegation not found' });

  const billingDay = delegation.paymentType?.billingCycleDay || 1;
  const today = new Date();
  const cycleStart = today.getDate() >= billingDay
    ? new Date(today.getFullYear(), today.getMonth(), billingDay)
    : new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingDay);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  const [requesterExpenses, ownerExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { delegationId: delegation.id, expenseDate: { gte: cycleStart, lte: cycleEnd } },
      include: { category: { select: { name: true, icon: true, color: true } } },
      orderBy: { expenseDate: 'desc' },
    }),
    delegation.ownerPaymentTypeId
      ? prisma.expense.findMany({
          where: {
            paymentTypeId: delegation.ownerPaymentTypeId,
            userId: delegation.ownerId,
            expenseDate: { gte: cycleStart, lte: cycleEnd },
          },
          include: { category: { select: { name: true, icon: true, color: true } } },
          orderBy: { expenseDate: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const requesterTotal  = requesterExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const ownerTotal      = ownerExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const willRepayTotal  = requesterExpenses.filter((e) => e.willRepay && !e.isRepaid).reduce((s, e) => s + Number(e.amount), 0);

  res.json({
    cycleStart,
    cycleEnd,
    card: delegation.paymentType,
    requester: delegation.requestedBy,
    owner: delegation.owner,
    hasOwnerCard: !!delegation.ownerPaymentTypeId,
    requesterExpenses,
    ownerExpenses,
    summary: { requesterTotal, ownerTotal, combinedTotal: requesterTotal + ownerTotal, willRepayTotal },
  });
};

module.exports = { list, create, approve, reject, revoke, getExpenses, getBalance, createRepayment, approveRepayment, rejectRepayment, toggleWillRepay, linkOwnerCard, getCombinedBill };
