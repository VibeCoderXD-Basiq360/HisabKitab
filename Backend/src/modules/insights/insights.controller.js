const prisma = require('../../lib/prisma');

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

const get = async (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const thisStart = startOfMonth(now);
  const thisEnd   = endOfMonth(now);
  const lastStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastEnd   = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [thisExpenses, lastExpenses, budgets, subsDueSoon, thisIncome] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, isReimbursement: false, expenseDate: { gte: thisStart, lte: thisEnd } },
      include: { category: { select: { id: true, name: true, icon: true } } },
    }),
    prisma.expense.findMany({
      where: { userId, isReimbursement: false, expenseDate: { gte: lastStart, lte: lastEnd } },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, icon: true } } },
    }),
    prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.income.findMany({
      where: { userId, incomeDate: { gte: thisStart, lte: thisEnd } },
      select: { amount: true },
    }),
  ]);

  const insights = [];

  // Net this month
  const totalExp    = thisExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = thisIncome.reduce((s, i) => s + Number(i.amount), 0);
  if (totalIncome > 0) {
    const net = totalIncome - totalExp;
    insights.push({
      type:     'net',
      icon:     net >= 0 ? '✅' : '⚠️',
      message:  net >= 0
        ? `Net +₹${Math.round(net).toLocaleString('en-IN')} this month (income ₹${Math.round(totalIncome).toLocaleString('en-IN')} − expenses ₹${Math.round(totalExp).toLocaleString('en-IN')})`
        : `Expenses exceed income by ₹${Math.round(Math.abs(net)).toLocaleString('en-IN')} this month`,
      priority: net < 0 ? 1 : 4,
    });
  }

  // Category spike vs last month (>30% more, last month >₹500 baseline)
  const thisCat = {};
  for (const e of thisExpenses) {
    if (!e.category) continue;
    if (!thisCat[e.category.name]) thisCat[e.category.name] = { total: 0, icon: e.category.icon };
    thisCat[e.category.name].total += Number(e.amount);
  }
  const lastCat = {};
  for (const e of lastExpenses) {
    if (!e.category) continue;
    lastCat[e.category.name] = (lastCat[e.category.name] || 0) + Number(e.amount);
  }
  let topSpike = null;
  for (const [cat, data] of Object.entries(thisCat)) {
    const prev = lastCat[cat] || 0;
    if (prev > 500) {
      const pct = ((data.total - prev) / prev) * 100;
      if (pct > 30 && (!topSpike || pct > topSpike.pct)) {
        topSpike = { cat, pct: Math.round(pct), icon: data.icon, extra: Math.round(data.total - prev) };
      }
    }
  }
  if (topSpike) {
    insights.push({
      type:     'category_spike',
      icon:     '📈',
      message:  `${topSpike.icon || ''} ${topSpike.cat} up ${topSpike.pct}% vs last month (+₹${topSpike.extra.toLocaleString('en-IN')})`,
      priority: 2,
    });
  }

  // Biggest expense this month
  if (thisExpenses.length > 0) {
    const biggest = [...thisExpenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    insights.push({
      type:     'big_expense',
      icon:     '💸',
      message:  `Biggest expense: "${biggest.title || 'Untitled'}" — ₹${Number(biggest.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      priority: 5,
    });
  }

  // Highest spend day of week (needs ≥5 expenses)
  if (thisExpenses.length >= 5) {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = {};
    for (const e of thisExpenses) {
      const day = new Date(e.expenseDate).getDay();
      dayTotals[day] = (dayTotals[day] || 0) + Number(e.amount);
    }
    const [topDay, topAmt] = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0] || [];
    if (topDay !== undefined) {
      insights.push({
        type:     'top_day',
        icon:     '📅',
        message:  `Most spending on ${DAY_NAMES[Number(topDay)]}s — ₹${Math.round(topAmt).toLocaleString('en-IN')} this month`,
        priority: 6,
      });
    }
  }

  // Budget alerts (≥80%)
  const budgetSpent = {};
  for (const e of thisExpenses) {
    if (e.categoryId) budgetSpent[e.categoryId] = (budgetSpent[e.categoryId] || 0) + Number(e.amount);
  }
  for (const b of budgets) {
    const spent = budgetSpent[b.categoryId] || 0;
    const pct   = Math.round((spent / Number(b.amount)) * 100);
    if (pct >= 80) {
      const remaining = Number(b.amount) - spent;
      insights.push({
        type:     'budget_alert',
        icon:     pct >= 100 ? '🚨' : '⚠️',
        message:  pct >= 100
          ? `${b.category.icon || ''} ${b.category.name} budget exceeded by ₹${Math.round(Math.abs(remaining)).toLocaleString('en-IN')}`
          : `${b.category.icon || ''} ${b.category.name} budget at ${pct}% — ₹${Math.round(remaining).toLocaleString('en-IN')} left`,
        priority: pct >= 100 ? 1 : 3,
      });
    }
  }

  // Subscriptions due this week
  if (subsDueSoon.length > 0) {
    const total = subsDueSoon.reduce((s, sub) => s + Number(sub.amount), 0);
    insights.push({
      type:     'subscriptions_due',
      icon:     '🔔',
      message:  `${subsDueSoon.length} subscription${subsDueSoon.length > 1 ? 's' : ''} due this week — ₹${Math.round(total).toLocaleString('en-IN')} total`,
      priority: 2,
      count:    subsDueSoon.length,
    });
  }

  insights.sort((a, b) => (a.priority || 5) - (b.priority || 5));
  res.json(insights.slice(0, 6));
};

module.exports = { get };
