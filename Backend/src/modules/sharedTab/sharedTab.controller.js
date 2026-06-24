const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

const USER_SELECT = { id: true, name: true, email: true, photoUrl: true, upiId: true };

const ENTRY_INCLUDE = {
  paidBy: { select: USER_SELECT },
};

const TAB_INCLUDE = {
  creator:  { select: USER_SELECT },
  member:   { select: USER_SELECT },
  members: {
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: 'asc' },
  },
  entries: { include: ENTRY_INCLUDE, orderBy: { date: 'desc' } },
  settlements: {
    include: {
      paidBy: { select: USER_SELECT },
      toUser: { select: USER_SELECT },
    },
    orderBy: { date: 'desc' },
  },
  group: { select: { id: true, name: true } },
};

// OR clause: current user can access a tab if they are creator, 2-person member, or TabMember
function accessOr(userId) {
  return {
    OR: [
      { creatorId: userId },
      { memberId: userId },
      { members: { some: { userId } } },
    ],
  };
}

// ── Balance helpers ──────────────────────────────────────────────────────────

function computeBalance2Person(tab, currentUserId) {
  let theyOweMe = 0;
  let iOweThem = 0;

  for (const e of tab.entries) {
    const amt = Number(e.amount);
    const iPaid = e.paidById === currentUserId;
    if (e.splitType === 'MINE_ONLY') continue;
    if (e.splitType === 'THEIRS_ONLY') {
      if (iPaid) theyOweMe += amt;
      else iOweThem += amt;
    } else {
      const share = amt * (e.splitRatio / 100);
      if (iPaid) theyOweMe += share;
      else iOweThem += share;
    }
  }

  for (const s of tab.settlements) {
    const amt = Number(s.amount);
    if (s.paidById === currentUserId) iOweThem -= amt;
    else theyOweMe -= amt;
  }

  const net = theyOweMe - iOweThem;
  return { net, youOwe: Math.max(0, -net), theyOwe: Math.max(0, net), isMultiMember: false };
}

function computeBalanceMulti(tab, currentUserId) {
  const regMembers = tab.members.filter((m) => m.userId);
  const memberCount = regMembers.length;
  if (memberCount === 0) return { members: [], totalOwed: 0, totalOwe: 0, isMultiMember: true };

  // netMap[uid] = positive means uid owes me, negative means I owe uid
  const netMap = {};
  for (const m of regMembers) {
    if (m.userId !== currentUserId) netMap[m.userId] = 0;
  }

  const perShare = (amt) => amt / memberCount;

  for (const e of tab.entries) {
    const amt = Number(e.amount);
    const share = perShare(amt);
    if (e.paidById === currentUserId) {
      for (const uid of Object.keys(netMap)) netMap[uid] += share;
    } else if (netMap[e.paidById] !== undefined) {
      netMap[e.paidById] -= share;
    }
  }

  for (const s of tab.settlements) {
    const amt = Number(s.amount);
    if (s.paidById === currentUserId && s.toUserId && netMap[s.toUserId] !== undefined) {
      netMap[s.toUserId] += amt;
    } else if (s.toUserId === currentUserId && netMap[s.paidById] !== undefined) {
      netMap[s.paidById] -= amt;
    }
  }

  const members = regMembers
    .filter((m) => m.userId !== currentUserId)
    .map((m) => {
      const net = netMap[m.userId] || 0;
      return {
        userId: m.userId,
        name: m.name || m.user?.name || m.user?.email || 'Member',
        photoUrl: m.user?.photoUrl || null,
        net,
        youOwe: Math.max(0, -net),
        theyOwe: Math.max(0, net),
      };
    });

  const totalOwed = members.reduce((s, m) => s + m.theyOwe, 0);
  const totalOwe  = members.reduce((s, m) => s + m.youOwe, 0);

  return { members, totalOwed, totalOwe, isMultiMember: true };
}

function attachBalance(tab, userId) {
  const balance = tab.memberId === null
    ? computeBalanceMulti(tab, userId)
    : computeBalance2Person(tab, userId);
  return { ...tab, balance };
}

// ── Controllers ───────────────────────────────────────────────────────────────

const listTabs = async (req, res) => {
  const userId = req.user.userId;

  const tabs = await prisma.sharedTab.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { memberId: userId, status: { not: 'DECLINED' } },
        { members: { some: { userId } } },
      ],
    },
    include: TAB_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });

  res.json(tabs.map((t) => attachBalance(t, userId)));
};

const createTab = async (req, res) => {
  const userId = req.user.userId;
  const { name, memberEmail, memberEmails } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const creator = await prisma.user.findUnique({ where: { id: userId } });

  // ── Multi-member path ──────────────────────────────────────────────────────
  if (Array.isArray(memberEmails) && memberEmails.length >= 1) {
    const emails = [...new Set(memberEmails.filter((e) => e && e !== creator.email))];
    if (emails.length === 0) return res.status(400).json({ error: 'Need at least one other member email' });

    const others = await prisma.user.findMany({ where: { email: { in: emails } } });
    const notFound = emails.filter((e) => !others.find((u) => u.email === e));
    if (notFound.length > 0) return res.status(404).json({ error: `No users found: ${notFound.join(', ')}` });
    if (others.some((u) => u.id === userId)) return res.status(400).json({ error: 'Cannot add yourself as a member' });

    const newTab = await prisma.sharedTab.create({
      data: { name, status: 'ACTIVE', creatorId: userId, memberId: null },
    });

    await prisma.tabMember.createMany({
      data: [
        { tabId: newTab.id, userId, name: creator.name || creator.email, email: creator.email, isCreator: true },
        ...others.map((u) => ({ tabId: newTab.id, userId: u.id, name: u.name || u.email, email: u.email, isCreator: false })),
      ],
    });

    const fullTab = await prisma.sharedTab.findUnique({ where: { id: newTab.id }, include: TAB_INCLUDE });

    for (const other of others) {
      notify(other.id, other.fcmToken, {
        title: '🤝 Tab Invite',
        body: `${creator.name || creator.email} added you to "${name}"`,
        data: { type: 'TAB_INVITE', tabId: newTab.id },
      }).catch(() => {});
    }

    return res.status(201).json(attachBalance(fullTab, userId));
  }

  // ── 2-person path ──────────────────────────────────────────────────────────
  if (!memberEmail) return res.status(400).json({ error: 'name and memberEmail are required' });

  const other = await prisma.user.findUnique({ where: { email: memberEmail } });
  if (!other) return res.status(404).json({ error: 'No user found with that email' });
  if (other.id === userId) return res.status(400).json({ error: 'Cannot create a tab with yourself' });

  const existing = await prisma.sharedTab.findFirst({
    where: {
      OR: [
        { creatorId: userId, memberId: other.id },
        { creatorId: other.id, memberId: userId },
      ],
      name,
      status: { not: 'DECLINED' },
    },
  });
  if (existing) return res.status(409).json({ error: 'A tab with this name already exists between you two' });

  const tab = await prisma.sharedTab.create({
    data: { name, status: 'PENDING', creatorId: userId, memberId: other.id },
    include: TAB_INCLUDE,
  });

  await notify(other.id, other.fcmToken, {
    title: '🤝 Tab Invite',
    body: `${creator.name || creator.email} invited you to "${name}"`,
    data: { type: 'TAB_INVITE', tabId: tab.id },
  });

  res.status(201).json(attachBalance(tab, userId));
};

const getTab = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const tab = await prisma.sharedTab.findFirst({
    where: { id, ...accessOr(userId) },
    include: TAB_INCLUDE,
  });

  if (!tab) return res.status(404).json({ error: 'Not found' });
  res.json(attachBalance(tab, userId));
};

const acceptTab = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const tab = await prisma.sharedTab.findFirst({
    where: { id, memberId: userId, status: 'PENDING' },
    include: { creator: true, member: true },
  });
  if (!tab) return res.status(404).json({ error: 'Invite not found or already responded' });

  const updated = await prisma.sharedTab.update({
    where: { id },
    data: { status: 'ACTIVE' },
    include: TAB_INCLUDE,
  });

  await notify(tab.creatorId, tab.creator.fcmToken, {
    title: '✅ Tab Accepted',
    body: `${tab.member.name || tab.member.email} accepted "${tab.name}"`,
    data: { type: 'TAB_ACCEPTED', tabId: tab.id },
  });

  res.json(attachBalance(updated, userId));
};

const declineTab = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const tab = await prisma.sharedTab.findFirst({
    where: { id, memberId: userId, status: 'PENDING' },
    include: { creator: true, member: true },
  });
  if (!tab) return res.status(404).json({ error: 'Invite not found or already responded' });

  const updated = await prisma.sharedTab.update({
    where: { id },
    data: { status: 'DECLINED' },
    include: TAB_INCLUDE,
  });

  await notify(tab.creatorId, tab.creator.fcmToken, {
    title: '❌ Tab Declined',
    body: `${tab.member.name || tab.member.email} declined "${tab.name}"`,
    data: { type: 'TAB_DECLINED', tabId: tab.id },
  });

  res.json(attachBalance(updated, userId));
};

const deleteTab = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const tab = await prisma.sharedTab.findFirst({ where: { id, creatorId: userId } });
  if (!tab) return res.status(404).json({ error: 'Not found or not authorised' });

  await prisma.sharedTab.delete({ where: { id } });
  res.json({ ok: true });
};

// ── Entries ───────────────────────────────────────────────────────────────────

async function createExpensesFor2Person({ userId, otherUserId, amount, splitType, ratio, description, date, category, tab, entryId }) {
  const otherShare =
    splitType === 'MINE_ONLY'   ? 0 :
    splitType === 'THEIRS_ONLY' ? Number(amount) :
    Number(amount) * (ratio / 100);

  const [payerPayment, otherPayment, payerCat, otherCat] = await Promise.all([
    prisma.paymentType.findFirst({ where: { userId, isDefault: true } })
      .then((r) => r || prisma.paymentType.findFirst({ where: { userId } })),
    otherShare > 0.01
      ? prisma.paymentType.findFirst({ where: { userId: otherUserId, isDefault: true } })
          .then((r) => r || prisma.paymentType.findFirst({ where: { userId: otherUserId } }))
      : null,
    category ? prisma.category.findFirst({ where: { userId, name: { equals: category, mode: 'insensitive' } } }) : null,
    category && otherShare > 0.01
      ? prisma.category.findFirst({ where: { userId: otherUserId, name: { equals: category, mode: 'insensitive' } } })
      : null,
  ]);

  const expDate = new Date(date);

  if (Number(amount) > 0.01 && payerPayment) {
    await prisma.expense.create({
      data: {
        userId,
        amount: Math.round(Number(amount) * 100) / 100,
        title: description,
        note: `From "${tab.name}" tab`,
        expenseDate: expDate,
        categoryId: payerCat?.id || null,
        paymentTypeId: payerPayment.id,
        tabEntryId: entryId,
      },
    });
  }

  if (otherShare > 0.01 && otherPayment) {
    await prisma.expense.create({
      data: {
        userId: otherUserId,
        amount: Math.round(otherShare * 100) / 100,
        title: description,
        note: `From "${tab.name}" tab (paid by payer)`,
        expenseDate: expDate,
        categoryId: otherCat?.id || null,
        paymentTypeId: otherPayment.id,
        tabEntryId: entryId,
      },
    });
  }
}

async function createExpensesForMultiMember({ payerUserId, members, amount, description, date, category, tab, entryId, payerName }) {
  const memberCount = members.length;
  const perShare = Number(amount) / memberCount;
  const expDate = new Date(date);

  await Promise.all(
    members.map(async (m) => {
      const mUserId = m.userId;
      const isPayer = mUserId === payerUserId;
      const expAmount = isPayer ? Number(amount) : perShare;

      const [payment, cat] = await Promise.all([
        prisma.paymentType.findFirst({ where: { userId: mUserId, isDefault: true } })
          .then((r) => r || prisma.paymentType.findFirst({ where: { userId: mUserId } })),
        category
          ? prisma.category.findFirst({ where: { userId: mUserId, name: { equals: category, mode: 'insensitive' } } })
          : null,
      ]);

      if (!payment) return;

      await prisma.expense.create({
        data: {
          userId: mUserId,
          amount: Math.round(expAmount * 100) / 100,
          title: description,
          note: isPayer ? `From "${tab.name}" tab` : `From "${tab.name}" tab (paid by ${payerName || 'payer'})`,
          expenseDate: expDate,
          categoryId: cat?.id || null,
          paymentTypeId: payment.id,
          tabEntryId: entryId,
        },
      });
    })
  );
}

const addEntry = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { amount, description, date, splitType, splitRatio, category, note } = req.body;

  const tab = await prisma.sharedTab.findFirst({
    where: { id, ...accessOr(userId) },
    include: { members: true },
  });
  if (!tab) return res.status(404).json({ error: 'Not found' });
  if (tab.status === 'CLOSED') return res.status(403).json({ error: 'This month is closed. Start a new month to add entries.' });
  if (tab.status !== 'ACTIVE') return res.status(403).json({ error: 'Tab is not active yet' });
  if (!amount || !description || !date) return res.status(400).json({ error: 'amount, description, date are required' });

  const isMultiMember = tab.memberId === null;

  if (!isMultiMember) {
    if (!splitType) return res.status(400).json({ error: 'splitType is required' });
    if (!['MINE_ONLY', 'THEIRS_ONLY', 'SPLIT'].includes(splitType)) return res.status(400).json({ error: 'Invalid splitType' });
  }

  const actualSplitType = isMultiMember ? 'SPLIT' : splitType;
  const ratio = isMultiMember ? 50 : (splitType === 'SPLIT' ? Number(splitRatio ?? 50) : 50);

  const entry = await prisma.tabEntry.create({
    data: {
      tabId: id,
      paidById: userId,
      amount: Number(amount),
      description,
      date: new Date(date),
      splitType: actualSplitType,
      splitRatio: ratio,
      category: category || null,
      note: note || null,
    },
    include: ENTRY_INCLUDE,
  });

  const payerName = entry.paidBy?.name || entry.paidBy?.email || 'Someone';

  if (isMultiMember) {
    const regMembers = tab.members.filter((m) => m.userId);
    await createExpensesForMultiMember({
      payerUserId: userId,
      members: regMembers,
      amount,
      description,
      date,
      category,
      tab,
      entryId: entry.id,
      payerName,
    });

    const otherMemberIds = regMembers.filter((m) => m.userId !== userId).map((m) => m.userId);
    const memberCount = regMembers.length;
    const perShare = Number(amount) / memberCount;

    const otherUsers = await prisma.user.findMany({
      where: { id: { in: otherMemberIds } },
      select: { id: true, fcmToken: true },
    });
    for (const u of otherUsers) {
      notify(u.id, u.fcmToken, {
        title: `💸 New entry in "${tab.name}"`,
        body: `${payerName} added "${description}" — you owe ₹${Math.round(perShare)}`,
        data: { type: 'TAB_ENTRY', tabId: id },
      }).catch(() => {});
    }
  } else {
    const otherUserId = tab.creatorId === userId ? tab.memberId : tab.creatorId;
    await createExpensesFor2Person({ userId, otherUserId, amount, splitType, ratio, description, date, category, tab, entryId: entry.id });

    const otherShare =
      splitType === 'MINE_ONLY'   ? 0 :
      splitType === 'THEIRS_ONLY' ? Number(amount) :
      Number(amount) * (ratio / 100);

    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId }, select: { fcmToken: true } });
    notify(otherUserId, otherUser?.fcmToken, {
      title: `💸 New entry in "${tab.name}"`,
      body: `${payerName} added "${description}" — ${
        splitType === 'MINE_ONLY' ? 'their expense only' :
        splitType === 'THEIRS_ONLY' ? `you owe ₹${Number(amount).toFixed(0)}` :
        `you owe ₹${Math.round(otherShare)}`
      }`,
      data: { type: 'TAB_ENTRY', tabId: id },
    }).catch(() => {});
  }

  await prisma.sharedTab.update({ where: { id }, data: { updatedAt: new Date() } });
  res.status(201).json(entry);
};

const updateEntry = async (req, res) => {
  const userId = req.user.userId;
  const { id, entryId } = req.params;
  const { amount, description, date, splitType, splitRatio, category, note } = req.body;

  const tab = await prisma.sharedTab.findFirst({
    where: { id, ...accessOr(userId) },
    include: { members: true },
  });
  if (!tab) return res.status(404).json({ error: 'Tab not found' });
  if (tab.status !== 'ACTIVE') return res.status(403).json({ error: 'Tab is not active' });

  const entry = await prisma.tabEntry.findFirst({ where: { id: entryId, tabId: id } });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.paidById !== userId) return res.status(403).json({ error: 'Only the payer can edit this entry' });

  const isMultiMember = tab.memberId === null;

  if (!isMultiMember && !['MINE_ONLY', 'THEIRS_ONLY', 'SPLIT'].includes(splitType)) {
    return res.status(400).json({ error: 'Invalid splitType' });
  }

  const actualSplitType = isMultiMember ? 'SPLIT' : splitType;
  const ratio = isMultiMember ? 50 : (splitType === 'SPLIT' ? Number(splitRatio ?? 50) : 50);

  await prisma.expense.deleteMany({ where: { tabEntryId: entryId } });

  const updated = await prisma.tabEntry.update({
    where: { id: entryId },
    data: {
      amount: Number(amount),
      description,
      date: new Date(date),
      splitType: actualSplitType,
      splitRatio: ratio,
      category: category || null,
      note: note || null,
    },
    include: ENTRY_INCLUDE,
  });

  const payerName = updated.paidBy?.name || updated.paidBy?.email || 'Someone';

  if (isMultiMember) {
    const regMembers = tab.members.filter((m) => m.userId);
    await createExpensesForMultiMember({
      payerUserId: userId,
      members: regMembers,
      amount,
      description,
      date,
      category,
      tab,
      entryId,
      payerName,
    });
  } else {
    const otherUserId = tab.creatorId === userId ? tab.memberId : tab.creatorId;
    await createExpensesFor2Person({ userId, otherUserId, amount, splitType, ratio, description, date, category, tab, entryId });
  }

  await prisma.sharedTab.update({ where: { id }, data: { updatedAt: new Date() } });
  res.json(updated);
};

const deleteEntry = async (req, res) => {
  const userId = req.user.userId;
  const { id, entryId } = req.params;

  const tab = await prisma.sharedTab.findFirst({ where: { id, ...accessOr(userId) } });
  if (!tab) return res.status(404).json({ error: 'Tab not found' });

  const entry = await prisma.tabEntry.findFirst({ where: { id: entryId, tabId: id } });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.paidById !== userId && tab.creatorId !== userId) return res.status(403).json({ error: 'Not authorised' });

  await prisma.tabEntry.delete({ where: { id: entryId } });
  res.json({ ok: true });
};

// ── Settlements ───────────────────────────────────────────────────────────────

const addSettlement = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { amount, note, date, toUserId } = req.body;

  const tab = await prisma.sharedTab.findFirst({ where: { id, ...accessOr(userId) } });
  if (!tab) return res.status(404).json({ error: 'Not found' });
  if (tab.status === 'CLOSED') return res.status(403).json({ error: 'This month is closed.' });
  if (tab.status !== 'ACTIVE') return res.status(403).json({ error: 'Tab is not active yet' });
  if (!amount) return res.status(400).json({ error: 'amount is required' });

  const isMultiMember = tab.memberId === null;
  if (isMultiMember && !toUserId) return res.status(400).json({ error: 'toUserId is required for multi-member tabs' });

  const receiverId = isMultiMember ? toUserId : (tab.creatorId === userId ? tab.memberId : tab.creatorId);
  const settlementDate = date ? new Date(date) : new Date();

  const settlement = await prisma.tabSettlement.create({
    data: {
      tabId: id,
      paidById: userId,
      toUserId: isMultiMember ? toUserId : null,
      amount: Number(amount),
      note: note || null,
      date: settlementDate,
    },
    include: {
      paidBy: { select: { id: true, name: true, email: true, photoUrl: true } },
      toUser: { select: { id: true, name: true, email: true, photoUrl: true } },
    },
  });

  const payer = settlement.paidBy;

  const receiverPayment = await prisma.paymentType.findFirst({ where: { userId: receiverId, isDefault: true } })
    .then((r) => r || prisma.paymentType.findFirst({ where: { userId: receiverId } }));

  if (receiverPayment) {
    await prisma.expense.create({
      data: {
        userId: receiverId,
        amount: Math.round(Number(amount) * 100) / 100,
        title: `Settlement — ${tab.name}`,
        note: `Received from ${payer?.name || 'other'}`,
        expenseDate: settlementDate,
        paymentTypeId: receiverPayment.id,
        isReimbursement: true,
        tabSettlementId: settlement.id,
      },
    });
  }

  const receiverUser = await prisma.user.findUnique({ where: { id: receiverId }, select: { fcmToken: true } });
  notify(receiverId, receiverUser?.fcmToken, {
    title: `💸 Payment received — ${tab.name}`,
    body: `${payer?.name || 'Someone'} paid ₹${Number(amount).toFixed(0)} towards "${tab.name}"`,
    data: { type: 'TAB_SETTLEMENT', tabId: id },
  }).catch(() => {});

  await prisma.sharedTab.update({ where: { id }, data: { updatedAt: new Date() } });
  res.status(201).json(settlement);
};

const deleteSettlement = async (req, res) => {
  const userId = req.user.userId;
  const { id, settlementId } = req.params;

  const tab = await prisma.sharedTab.findFirst({ where: { id, ...accessOr(userId) } });
  if (!tab) return res.status(404).json({ error: 'Tab not found' });

  const settlement = await prisma.tabSettlement.findFirst({ where: { id: settlementId, tabId: id } });
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.paidById !== userId && tab.creatorId !== userId) return res.status(403).json({ error: 'Not authorised' });

  await prisma.tabSettlement.delete({ where: { id: settlementId } });
  res.json({ ok: true });
};

module.exports = {
  listTabs, createTab, getTab, acceptTab, declineTab, deleteTab,
  addEntry, updateEntry, deleteEntry, addSettlement, deleteSettlement,
};
