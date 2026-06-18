const prisma = require('../../lib/prisma');

async function listActivity(req, res) {
  const userId = req.user.userId;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const [expenses, splits, newGroupMembers, groupSettlements, groupExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, createdAt: { gte: since } },
      include: {
        category: { select: { name: true, icon: true, color: true } },
        group: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.expenseSplit.findMany({
      where: {
        expense: { userId },
        status: { in: ['CONFIRMED', 'WAIVED'] },
        updatedAt: { gte: since },
      },
      include: {
        person: { select: { name: true } },
        expense: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    groupIds.length > 0
      ? prisma.groupMember.findMany({
          where: { groupId: { in: groupIds }, userId: { not: userId }, createdAt: { gte: since } },
          include: { group: { select: { id: true, name: true, icon: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [],
    groupIds.length > 0
      ? prisma.groupSettlement.findMany({
          where: { groupId: { in: groupIds }, createdAt: { gte: since } },
          include: {
            fromMember: { select: { name: true } },
            toMember: { select: { name: true } },
            group: { select: { id: true, name: true, icon: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [],
    groupIds.length > 0
      ? prisma.groupExpense.findMany({
          where: { groupId: { in: groupIds }, createdAt: { gte: since } },
          include: {
            addedBy: { select: { name: true, userId: true } },
            paidBy: { select: { name: true } },
            group: { select: { id: true, name: true, icon: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
      : [],
  ]);

  const items = [];

  for (const e of expenses) {
    items.push({
      id: `exp-${e.id}`,
      type: 'expense_added',
      icon: e.category?.icon || '💸',
      iconBg: e.category?.color ? `${e.category.color}25` : null,
      title: `Added "${e.title || e.category?.name || 'Expense'}"`,
      subtitle: [
        e.category?.name || 'Uncategorised',
        `${e.currency || 'INR'} ${Number(e.amount).toFixed(0)}`,
        e.group ? `${e.group.icon} ${e.group.name}` : null,
      ].filter(Boolean).join(' · '),
      link: `/expense/${e.id}`,
      createdAt: e.createdAt,
    });
  }

  for (const s of splits) {
    if (s.status === 'CONFIRMED') {
      items.push({
        id: `split-${s.id}`,
        type: 'split_settled',
        icon: '✅',
        iconBg: null,
        title: `${s.person.name} settled up`,
        subtitle: `₹${Number(s.amount).toFixed(0)} for "${s.expense.title || 'Expense'}"`,
        link: `/expense/${s.expenseId}`,
        createdAt: s.updatedAt,
      });
    } else if (s.status === 'WAIVED') {
      items.push({
        id: `split-waived-${s.id}`,
        type: 'split_waived',
        icon: '🎁',
        iconBg: null,
        title: `Waived for ${s.person.name}`,
        subtitle: `₹${Number(s.amount).toFixed(0)} · "${s.expense.title || 'Expense'}"`,
        link: `/expense/${s.expenseId}`,
        createdAt: s.updatedAt,
      });
    }
  }

  for (const m of newGroupMembers) {
    items.push({
      id: `gm-${m.id}`,
      type: 'group_member_joined',
      icon: '👋',
      iconBg: null,
      title: `${m.name} joined ${m.group.name}`,
      subtitle: `${m.group.icon} ${m.group.name}`,
      link: `/groups/${m.groupId}`,
      createdAt: m.createdAt,
    });
  }

  for (const s of groupSettlements) {
    items.push({
      id: `gs-${s.id}`,
      type: 'group_settlement',
      icon: '💸',
      iconBg: null,
      title: `${s.fromMember.name} → ${s.toMember.name}`,
      subtitle: `₹${Number(s.amount).toFixed(0)} in ${s.group.icon} ${s.group.name}`,
      link: `/groups/${s.groupId}`,
      createdAt: s.createdAt,
    });
  }

  for (const ge of groupExpenses) {
    const isOwnAdd = ge.addedBy.userId === userId;
    items.push({
      id: `ge-${ge.id}`,
      type: 'group_expense_added',
      icon: '📋',
      iconBg: null,
      title: `${isOwnAdd ? 'You' : ge.addedBy.name} added "${ge.title}"`,
      subtitle: `Paid by ${ge.paidBy.name} · ₹${Number(ge.amount).toFixed(0)} in ${ge.group.icon} ${ge.group.name}`,
      link: `/groups/${ge.groupId}`,
      createdAt: ge.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(items.slice(0, 50));
}

module.exports = { listActivity };
