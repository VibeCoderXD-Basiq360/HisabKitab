const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function monthLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function computeBalance(tab, currentUserId) {
  let theyOweMe = 0, iOweThem = 0;
  for (const e of tab.entries) {
    const amt = Number(e.amount);
    const iPaid = e.paidById === currentUserId;
    if (e.splitType === 'MINE_ONLY') continue;
    if (e.splitType === 'THEIRS_ONLY') {
      if (iPaid) theyOweMe += amt; else iOweThem += amt;
    } else {
      const share = amt * (e.splitRatio / 100);
      if (iPaid) theyOweMe += share; else iOweThem += share;
    }
  }
  for (const s of tab.settlements) {
    const amt = Number(s.amount);
    if (s.paidById === currentUserId) iOweThem -= amt; else theyOweMe -= amt;
  }
  const net = theyOweMe - iOweThem;
  return { net, youOwe: Math.max(0, -net), theyOwe: Math.max(0, net) };
}

const TAB_INCLUDE = {
  entries: {
    include: { paidBy: { select: { id: true, name: true, email: true } } },
    orderBy: { date: 'desc' },
  },
  settlements: {
    include: { paidBy: { select: { id: true, name: true, email: true } } },
    orderBy: { date: 'desc' },
  },
};

const GROUP_INCLUDE = {
  creator: { select: { id: true, name: true, email: true, photoUrl: true } },
  member:  { select: { id: true, name: true, email: true, photoUrl: true } },
  tabs: {
    include: TAB_INCLUDE,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  },
};

const listGroups = async (req, res) => {
  const userId = req.user.userId;

  const groups = await prisma.tabGroup.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { memberId: userId, status: { not: 'DECLINED' } },
      ],
    },
    include: GROUP_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });

  res.json(groups.map((g) => ({
    ...g,
    tabs: g.tabs.map((t) => ({ ...t, balance: computeBalance(t, userId) })),
  })));
};

const createGroup = async (req, res) => {
  const userId = req.user.userId;
  const { name, memberEmail } = req.body;

  if (!name || !memberEmail) return res.status(400).json({ error: 'name and memberEmail are required' });

  const [creator, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { email: memberEmail } }),
  ]);

  if (!other) return res.status(404).json({ error: 'No user found with that email' });
  if (other.id === userId) return res.status(400).json({ error: 'Cannot create a group with yourself' });

  const group = await prisma.tabGroup.create({
    data: { name, status: 'PENDING', creatorId: userId, memberId: other.id },
    include: GROUP_INCLUDE,
  });

  await notify(other.id, other.fcmToken, {
    title: '🗂️ Tab Group Invite',
    body: `${creator.name || creator.email} invited you to "${name}" group`,
    data: { type: 'TAB_GROUP_INVITE', groupId: group.id },
  });

  res.status(201).json({ ...group, tabs: [] });
};

const getGroup = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const group = await prisma.tabGroup.findFirst({
    where: { id, OR: [{ creatorId: userId }, { memberId: userId }] },
    include: GROUP_INCLUDE,
  });

  if (!group) return res.status(404).json({ error: 'Not found' });

  res.json({
    ...group,
    tabs: group.tabs.map((t) => ({ ...t, balance: computeBalance(t, userId) })),
  });
};

const acceptGroup = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const group = await prisma.tabGroup.findFirst({
    where: { id, memberId: userId, status: 'PENDING' },
    include: { creator: true, member: true },
  });
  if (!group) return res.status(404).json({ error: 'Invite not found or already responded' });

  const { month, year } = currentMonthYear();

  // Activate group and create first monthly tab
  const [updated] = await prisma.$transaction([
    prisma.tabGroup.update({ where: { id }, data: { status: 'ACTIVE' } }),
    prisma.sharedTab.create({
      data: {
        name: monthLabel(month, year),
        status: 'ACTIVE',
        creatorId: group.creatorId,
        memberId: group.memberId,
        groupId: id,
        month,
        year,
      },
    }),
  ]);

  await notify(group.creatorId, group.creator.fcmToken, {
    title: '✅ Group Accepted',
    body: `${group.member.name || group.member.email} accepted "${group.name}"`,
    data: { type: 'TAB_GROUP_ACCEPTED', groupId: id },
  });

  const full = await prisma.tabGroup.findUnique({ where: { id }, include: GROUP_INCLUDE });
  res.json({
    ...full,
    tabs: full.tabs.map((t) => ({ ...t, balance: computeBalance(t, userId) })),
  });
};

const declineGroup = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const group = await prisma.tabGroup.findFirst({
    where: { id, memberId: userId, status: 'PENDING' },
    include: { creator: true, member: true },
  });
  if (!group) return res.status(404).json({ error: 'Invite not found or already responded' });

  await prisma.tabGroup.update({ where: { id }, data: { status: 'DECLINED' } });

  await notify(group.creatorId, group.creator.fcmToken, {
    title: '❌ Group Declined',
    body: `${group.member.name || group.member.email} declined "${group.name}"`,
    data: { type: 'TAB_GROUP_DECLINED', groupId: id },
  });

  res.json({ ok: true });
};

const newMonth = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const group = await prisma.tabGroup.findFirst({
    where: { id, OR: [{ creatorId: userId }, { memberId: userId }], status: 'ACTIVE' },
    include: {
      tabs: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 1 },
    },
  });
  if (!group) return res.status(404).json({ error: 'Group not found or not active' });

  // Determine next month
  const last = group.tabs[0];
  let month, year;
  if (last) {
    if (last.month === 12) { month = 1; year = last.year + 1; }
    else { month = last.month + 1; year = last.year; }
  } else {
    ({ month, year } = currentMonthYear());
  }

  // Check for duplicate
  const exists = await prisma.sharedTab.findFirst({ where: { groupId: id, month, year } });
  if (exists) return res.status(409).json({ error: `${monthLabel(month, year)} already exists` });

  // Close current active tab (if any)
  if (last && last.status === 'ACTIVE') {
    await prisma.sharedTab.update({ where: { id: last.id }, data: { status: 'CLOSED' } });
  }

  const newTab = await prisma.sharedTab.create({
    data: {
      name: monthLabel(month, year),
      status: 'ACTIVE',
      creatorId: group.creatorId,
      memberId: group.memberId,
      groupId: id,
      month,
      year,
    },
  });

  await prisma.tabGroup.update({ where: { id }, data: { updatedAt: new Date() } });

  res.status(201).json(newTab);
};

const deleteGroup = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const group = await prisma.tabGroup.findFirst({ where: { id, creatorId: userId } });
  if (!group) return res.status(404).json({ error: 'Not found or not authorised' });

  await prisma.tabGroup.delete({ where: { id } });
  res.json({ ok: true });
};

module.exports = { listGroups, createGroup, getGroup, acceptGroup, declineGroup, newMonth, deleteGroup };
