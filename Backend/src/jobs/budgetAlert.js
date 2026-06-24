const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { notify } = require('../lib/notify');

const prisma = new PrismaClient();

const THRESHOLDS = [50, 80, 100];

async function processBudgetAlerts() {
  console.log('[budgetAlert] Running…');

  const today = new Date();
  const isFirstOfMonth = today.getDate() === 1;
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);

  // Reset lastAlertPct on the 1st of each month
  if (isFirstOfMonth) {
    await prisma.budget.updateMany({ data: { lastAlertPct: 0 } });
    console.log('[budgetAlert] Reset all lastAlertPct for new month');
  }

  const budgets = await prisma.budget.findMany({
    include: {
      user: { select: { id: true, fcmToken: true } },
      category: { select: { name: true } },
    },
  });

  if (budgets.length === 0) return;

  // Batch-fetch spending for all users this month
  const spendRows = await prisma.expense.groupBy({
    by: ['userId', 'categoryId'],
    where: {
      expenseDate: { gte: fromDate },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  });

  const spendMap = {};
  for (const row of spendRows) {
    spendMap[`${row.userId}:${row.categoryId}`] = Number(row._sum.amount || 0);
  }

  let sent = 0;
  for (const budget of budgets) {
    try {
      const spent = spendMap[`${budget.userId}:${budget.categoryId}`] || 0;
      const pct = Math.round((spent / Number(budget.amount)) * 100);

      // Find the highest threshold we've crossed that hasn't been notified yet
      const newThreshold = THRESHOLDS.slice().reverse().find(
        (t) => pct >= t && budget.lastAlertPct < t
      );
      if (!newThreshold) continue;

      let title, body;
      if (newThreshold === 100) {
        title = `Budget exhausted: ${budget.category.name}`;
        body = `You've used 100% of your ₹${Number(budget.amount).toLocaleString('en-IN')} budget for ${budget.category.name} this month.`;
      } else if (newThreshold === 80) {
        title = `Budget 80% used: ${budget.category.name}`;
        body = `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${Number(budget.amount).toLocaleString('en-IN')} budget for ${budget.category.name}.`;
      } else {
        title = `Budget halfway: ${budget.category.name}`;
        body = `You've used 50% of your ₹${Number(budget.amount).toLocaleString('en-IN')} budget for ${budget.category.name} this month.`;
      }

      await notify(budget.userId, budget.user.fcmToken, {
        title,
        body,
        data: { type: 'BUDGET_ALERT', categoryId: budget.categoryId, pct: String(pct) },
      });

      await prisma.budget.update({
        where: { id: budget.id },
        data: { lastAlertPct: newThreshold },
      });

      sent++;
    } catch (err) {
      console.error(`[budgetAlert] Failed for budget ${budget.id}:`, err.message);
    }
  }

  console.log(`[budgetAlert] Done — ${sent} alert(s) sent`);
}

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', processBudgetAlerts);

module.exports = { processBudgetAlerts };
