const prisma = require('../../lib/prisma');

const search = async (req, res) => {
  const { q } = req.query;
  const userId = req.user.userId;

  if (!q || q.trim().length < 2) {
    return res.json({ expenses: [], people: [], groups: [], tabs: [], loans: [] });
  }

  const contains = { contains: q.trim(), mode: 'insensitive' };

  const [expenses, people, groups, tabs, loans] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, isReimbursement: false, title: contains },
      take: 6,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: { select: { name: true, icon: true, color: true } },
        paymentType: { select: { name: true } },
      },
    }),
    prisma.person.findMany({
      where: { userId, name: contains },
      take: 5,
    }),
    prisma.group.findMany({
      where: { members: { some: { userId } }, name: contains },
      take: 5,
      select: { id: true, name: true, icon: true },
    }),
    prisma.sharedTab.findMany({
      where: { OR: [{ creatorId: userId }, { memberId: userId }], name: contains },
      take: 5,
      select: { id: true, name: true, status: true, groupId: true },
    }),
    prisma.loan.findMany({
      where: { userId, title: contains },
      take: 5,
      select: { id: true, title: true, amount: true, status: true },
    }),
  ]);

  res.json({ expenses, people, groups, tabs, loans });
};

module.exports = { search };
