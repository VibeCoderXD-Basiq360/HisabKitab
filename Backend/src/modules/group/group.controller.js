const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

// ─── helpers ────────────────────────────────────────────────────────────────

function computeBalances(members, groupExpenses, settlements) {
  const net = {};
  members.forEach((m) => (net[m.id] = 0));

  for (const exp of groupExpenses) {
    net[exp.paidByMemberId] = (net[exp.paidByMemberId] || 0) + Number(exp.amount);
    for (const share of exp.shares) {
      net[share.memberId] = (net[share.memberId] || 0) - Number(share.amount);
    }
  }
  for (const s of settlements) {
    net[s.fromMemberId] = (net[s.fromMemberId] || 0) + Number(s.amount);
    net[s.toMemberId] = (net[s.toMemberId] || 0) - Number(s.amount);
  }

  return members.map((m) => ({
    memberId: m.id,
    name: m.name,
    userId: m.userId,
    net: Math.round((net[m.id] || 0) * 100) / 100,
  }));
}

function computeSettlePlan(balances) {
  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);
  const txns = [];
  let ci = 0,
    di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci],
      d = debtors[di];
    const amount = Math.min(c.net, -d.net);
    txns.push({
      fromMemberId: d.memberId,
      fromName: d.name,
      toMemberId: c.memberId,
      toName: c.name,
      amount: Math.round(amount * 100) / 100,
    });
    c.net -= amount;
    d.net += amount;
    if (Math.abs(c.net) < 0.01) ci++;
    if (Math.abs(d.net) < 0.01) di++;
  }
  return txns;
}

// include shape for full group fetches
const groupInclude = {
  members: true,
  groupExpenses: {
    orderBy: { expenseDate: 'desc' },
    include: {
      shares: true,
      paidBy: true,
      addedBy: true,
    },
  },
  settlements: {
    orderBy: { createdAt: 'desc' },
    include: { fromMember: true, toMember: true },
  },
};

// ─── list ────────────────────────────────────────────────────────────────────

const list = async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.userId },
    include: {
      group: {
        include: groupInclude,
      },
    },
  });

  const result = memberships.map(({ group, id: myMemberId }) => {
    const balances = computeBalances(group.members, group.groupExpenses, group.settlements);
    const myBalance = balances.find((b) => b.memberId === myMemberId);
    return {
      ...group,
      memberCount: group.members.length,
      myNet: myBalance ? myBalance.net : 0,
      myMemberId,
    };
  });

  res.json(result);
};

// ─── create ───────────────────────────────────────────────────────────────────

const create = async (req, res) => {
  const { name, icon, type, members = [] } = req.body;

  const creatorUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, fcmToken: true },
  });

  const group = await prisma.group.create({
    data: {
      name,
      icon: icon || '👥',
      type: type || 'OTHER',
      createdByUserId: req.user.userId,
      members: {
        create: [
          // creator as ADMIN
          {
            userId: req.user.userId,
            name: creatorUser.name || creatorUser.email || 'You',
            email: creatorUser.email,
            role: 'ADMIN',
          },
          // additional members
          ...members.map((m) => ({
            userId: m.userId || null,
            name: m.name,
            email: m.email || null,
            role: 'MEMBER',
          })),
        ],
      },
    },
    include: { members: true },
  });

  // FCM notify new members who have a userId (excluding the creator)
  const memberUserIds = members
    .filter((m) => m.userId && m.userId !== req.user.userId)
    .map((m) => m.userId);

  if (memberUserIds.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, fcmToken: true },
    });
    await Promise.all(
      users.map((u) =>
        notify(u.id, u.fcmToken, {
          title: 'Added to a group',
          body: `You've been added to group "${name}"`,
          data: { type: 'GROUP_ADDED', groupId: group.id },
        })
      )
    );
  }

  res.status(201).json(group);
};

// ─── getGroup ────────────────────────────────────────────────────────────────

const getGroup = async (req, res) => {
  const membership = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, userId: req.user.userId },
  });
  if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: groupInclude,
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const balances = computeBalances(group.members, group.groupExpenses, group.settlements);
  const settlePlan = computeSettlePlan(balances);

  res.json({ ...group, balances, settlePlan });
};

// ─── addExpense ───────────────────────────────────────────────────────────────

const addExpense = async (req, res) => {
  const { title, amount, currency = 'INR', note, expenseDate, paidByMemberId, splitType, shares = [] } = req.body;

  const callerMember = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, userId: req.user.userId },
  });
  if (!callerMember) return res.status(403).json({ error: 'Not a member of this group' });

  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: { members: true },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Snapshot exchange rate at time of expense creation
  let rateAtTime = null;
  if (currency && currency !== 'INR') {
    const er = await prisma.exchangeRate.findFirst({
      where: { userId: req.user.userId, fromCurrency: currency.toUpperCase(), toCurrency: 'INR' },
      select: { rate: true },
    });
    if (er) rateAtTime = Number(er.rate);
  }

  // Resolve shares
  let resolvedShares = shares;
  if (splitType === 'EQUAL') {
    const memberCount = group.members.length;
    const base = Math.floor((Number(amount) / memberCount) * 100) / 100;
    const remainder = Math.round((Number(amount) - base * memberCount) * 100) / 100;
    resolvedShares = group.members.map((m, i) => ({
      memberId: m.id,
      amount: i === 0 ? Math.round((base + remainder) * 100) / 100 : base,
    }));
  }

  const groupExpense = await prisma.groupExpense.create({
    data: {
      groupId: req.params.id,
      addedByMemberId: callerMember.id,
      paidByMemberId,
      amount: Number(amount),
      currency,
      rateAtTime,
      title,
      note: note || null,
      expenseDate: new Date(expenseDate),
      splitType: splitType || 'EQUAL',
      shares: {
        create: resolvedShares.map((s) => ({
          memberId: s.memberId,
          amount: Number(s.amount),
        })),
      },
    },
    include: { shares: true, paidBy: true, addedBy: true },
  });

  // Create a real Expense in the paidBy member's account if they have a userId
  const paidByMember = groupExpense.paidBy;
  if (paidByMember.userId) {
    const paymentType = await prisma.paymentType.findFirst({
      where: { userId: paidByMember.userId },
    });
    if (paymentType) {
      await prisma.expense.create({
        data: {
          userId: paidByMember.userId,
          amount: Number(amount),
          currency,
          rateAtTime,
          title,
          note: `Group: ${group.name}`,
          expenseDate: new Date(expenseDate),
          paymentTypeId: paymentType.id,
          groupId: group.id,
        },
      });
    }
  }

  // FCM notify all other group members who have fcmToken
  const adderName = callerMember.name;
  const otherMembers = group.members.filter((m) => m.userId && m.id !== callerMember.id);
  if (otherMembers.length) {
    const userIds = otherMembers.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fcmToken: true },
    });
    await Promise.all(
      users.map((u) =>
        notify(u.id, u.fcmToken, {
          title: group.name,
          body: `${adderName} added "${title}" ₹${Number(amount)} in ${group.name}`,
          data: { type: 'GROUP_EXPENSE_ADDED', groupId: group.id, expenseId: groupExpense.id },
        })
      )
    );
  }

  res.status(201).json(groupExpense);
};

// ─── deleteExpense ────────────────────────────────────────────────────────────

const deleteExpense = async (req, res) => {
  const callerMember = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, userId: req.user.userId },
  });
  if (!callerMember) return res.status(403).json({ error: 'Not a member of this group' });

  const expense = await prisma.groupExpense.findFirst({
    where: { id: req.params.eid, groupId: req.params.id },
    include: { paidBy: true },
  });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  const isAdmin = callerMember.role === 'ADMIN';
  const isAdder = expense.addedByMemberId === callerMember.id;
  if (!isAdmin && !isAdder) return res.status(403).json({ error: 'Not allowed to delete this expense' });

  // Delete GroupExpense (shares cascade)
  await prisma.groupExpense.delete({ where: { id: req.params.eid } });

  // Attempt to delete the linked real Expense if the paidBy member has a userId
  if (expense.paidBy.userId) {
    const candidates = await prisma.expense.findMany({
      where: {
        groupId: req.params.id,
        userId: expense.paidBy.userId,
        title: expense.title,
        amount: Number(expense.amount),
      },
      orderBy: { expenseDate: 'desc' },
    });
    // Find closest match by date
    if (candidates.length) {
      const expDate = new Date(expense.expenseDate).getTime();
      const closest = candidates.reduce((prev, curr) =>
        Math.abs(new Date(curr.expenseDate).getTime() - expDate) <
        Math.abs(new Date(prev.expenseDate).getTime() - expDate)
          ? curr
          : prev
      );
      await prisma.expense.delete({ where: { id: closest.id } });
    }
  }

  res.status(204).end();
};

// ─── recordSettlement ─────────────────────────────────────────────────────────

const recordSettlement = async (req, res) => {
  const { fromMemberId, toMemberId, amount, note } = req.body;

  const callerMember = await prisma.groupMember.findFirst({
    where: { groupId: req.params.id, userId: req.user.userId },
  });
  if (!callerMember) return res.status(403).json({ error: 'Not a member of this group' });

  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const settlement = await prisma.groupSettlement.create({
    data: {
      groupId: req.params.id,
      fromMemberId,
      toMemberId,
      amount: Number(amount),
      note: note || null,
    },
    include: { fromMember: true, toMember: true },
  });

  // Create a real Expense in the fromMember's account if they have a userId
  if (settlement.fromMember.userId) {
    const paymentType = await prisma.paymentType.findFirst({
      where: { userId: settlement.fromMember.userId },
    });
    if (paymentType) {
      await prisma.expense.create({
        data: {
          userId: settlement.fromMember.userId,
          amount: Number(amount),
          title: `Settlement: ${group.name}`,
          note: note || null,
          expenseDate: new Date(),
          paymentTypeId: paymentType.id,
          groupId: group.id,
        },
      });
    }
  }

  // FCM notify toMember if they have a userId
  if (settlement.toMember.userId) {
    const toUser = await prisma.user.findUnique({
      where: { id: settlement.toMember.userId },
      select: { id: true, fcmToken: true },
    });
    await notify(toUser?.id, toUser?.fcmToken, {
      title: group.name,
      body: `${settlement.fromMember.name} settled ₹${Number(amount)} with you in ${group.name}`,
      data: { type: 'GROUP_SETTLEMENT', groupId: group.id, settlementId: settlement.id },
    });
  }

  res.status(201).json(settlement);
};

// ─── searchUsers ──────────────────────────────────────────────────────────────

const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user.userId },
      OR: [
        { email: q },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, photoUrl: true },
    take: 20,
  });

  res.json(users);
};

module.exports = { list, create, getGroup, addExpense, deleteExpense, recordSettlement, searchUsers };
