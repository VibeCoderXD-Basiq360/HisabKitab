const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('../lib/mailer');
const { startOfMonth, endOfMonth, subMonths, format } = require('date-fns');

const prisma = new PrismaClient();

function fmt(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function buildHtml({ userName, month, totalSpent, topCategories, budgetAlerts, expenseCount }) {
  const catRows = topCategories
    .map(([name, total]) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${name}</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${fmt(total)}</td>
      </tr>`)
    .join('');

  const alertRows = budgetAlerts
    .map((b) => `
      <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:600;color:#92400e;">${b.name}</span>
        <span style="font-size:13px;color:#b45309;float:right;">${b.pct}% of ${fmt(b.budget)}</span>
      </div>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 28px;">
      <p style="margin:0;font-size:13px;color:#c7d2fe;letter-spacing:.05em;text-transform:uppercase;">HisabKitab</p>
      <h1 style="margin:8px 0 4px;font-size:24px;font-weight:700;color:#fff;">Your ${month} Report</h1>
      <p style="margin:0;font-size:14px;color:#c7d2fe;">Hi ${userName}, here's your spending summary.</p>
    </div>

    <div style="padding:24px 28px;">
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#f5f3ff;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Total Spent</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#4c1d95;">${fmt(totalSpent)}</p>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px 18px;">
          <p style="margin:0;font-size:12px;color:#15803d;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Transactions</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#14532d;">${expenseCount}</p>
        </div>
      </div>

      ${topCategories.length > 0 ? `
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">Top Categories</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${catRows}
      </table>` : ''}

      ${budgetAlerts.length > 0 ? `
      <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">Budget Alerts</h2>
      <div style="margin-bottom:24px;">${alertRows}</div>` : ''}

      <div style="text-align:center;padding:16px 0 8px;">
        <a href="${process.env.CLIENT_URL || 'https://hisabkitab.app'}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Open HisabKitab</a>
      </div>
    </div>

    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you have a HisabKitab account. Open the app to manage preferences.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendMonthlyReports() {
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
  const monthLabel = format(lastMonthStart, 'MMMM yyyy');

  console.log(`[monthlyReport] Sending reports for ${monthLabel}`);

  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true, name: true },
  });

  let sent = 0, skipped = 0;

  for (const user of users) {
    try {
      const expenses = await prisma.expense.findMany({
        where: { userId: user.id, expenseDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        include: { category: { select: { name: true } } },
      });

      if (expenses.length === 0) { skipped++; continue; }

      const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);

      const byCat = {};
      for (const e of expenses) {
        const key = e.category?.name || 'Uncategorized';
        byCat[key] = (byCat[key] || 0) + Number(e.amount);
      }
      const topCategories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const budgets = await prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: { select: { name: true } } },
      });

      const budgetAlerts = budgets
        .map((b) => {
          const spent = expenses
            .filter((e) => e.categoryId === b.categoryId)
            .reduce((s, e) => s + Number(e.amount), 0);
          const pct = Math.round((spent / Number(b.amount)) * 100);
          return { name: b.category.name, budget: Number(b.amount), spent, pct };
        })
        .filter((b) => b.pct >= 80);

      await sendEmail({
        to: user.email,
        subject: `Your HisabKitab report for ${monthLabel}`,
        html: buildHtml({
          userName: user.name || 'there',
          month: monthLabel,
          totalSpent,
          topCategories,
          budgetAlerts,
          expenseCount: expenses.length,
        }),
      });
      sent++;
    } catch (err) {
      console.error(`[monthlyReport] Failed for ${user.email}:`, err.message);
    }
  }

  console.log(`[monthlyReport] Done — ${sent} sent, ${skipped} skipped (no activity)`);
}

// Run at 9:00 AM on the 1st of every month
cron.schedule('0 9 1 * *', sendMonthlyReports);

module.exports = { sendMonthlyReports };
