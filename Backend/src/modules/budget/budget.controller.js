const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const [categories, budgets, spendRows] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        expenseDate: { gte: fromDate },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b]));
  const spendMap = Object.fromEntries(
    spendRows.map((r) => [r.categoryId, Number(r._sum.amount || 0)])
  );

  const result = categories.map((cat) => {
    const budget = budgetMap[cat.id] || null;
    const spent = spendMap[cat.id] || 0;
    const percentage = budget ? Math.round((spent / Number(budget.amount)) * 100) : null;
    return {
      categoryId: cat.id,
      category: cat,
      budget: budget ? { id: budget.id, amount: Number(budget.amount) } : null,
      spent,
      percentage,
    };
  });

  res.json(result);
};

const upsert = async (req, res) => {
  const userId = req.user.userId;
  const { categoryId } = req.params;
  const { amount } = req.body;

  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId, amount },
    update: { amount },
  });

  res.json({ id: budget.id, categoryId: budget.categoryId, amount: Number(budget.amount) });
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.budget.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, upsert, remove };
