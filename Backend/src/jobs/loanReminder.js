const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { notify } = require('../lib/notify');

const prisma = new PrismaClient();

function getNextEmiDueDate(startDate) {
  const dueDay = new Date(startDate).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  thisMonth.setHours(0, 0, 0, 0);
  return thisMonth >= today
    ? thisMonth
    : new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
}

function fmtDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function processLoanReminders() {
  console.log('[loanReminder] Running…');

  const loans = await prisma.loan.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true, fcmToken: true } },
      payments: { select: { id: true } },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const loan of loans) {
    try {
      const monthsPaid = loan.payments.length;
      if (monthsPaid >= loan.tenureMonths) continue; // fully paid off

      const dueDate = getNextEmiDueDate(loan.startDate);
      const daysUntilDue = Math.round((dueDate - today) / 86400000);

      if (daysUntilDue !== 3 && daysUntilDue !== 1 && daysUntilDue !== 0) continue;

      let title, body;
      if (daysUntilDue === 0) {
        title = `EMI due TODAY: ${loan.name}`;
        body = `Your EMI of ₹${Number(loan.emiAmount).toLocaleString('en-IN')} for ${loan.name} is due today.`;
      } else {
        title = `EMI due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}: ${loan.name}`;
        body = `Your EMI of ₹${Number(loan.emiAmount).toLocaleString('en-IN')} for ${loan.name} is due on ${fmtDate(dueDate)}.`;
      }

      await notify(loan.userId, loan.user.fcmToken, {
        title,
        body,
        data: { type: 'LOAN_EMI_DUE', loanId: loan.id, daysUntilDue: String(daysUntilDue) },
      });

      sent++;
    } catch (err) {
      console.error(`[loanReminder] Failed for loan ${loan.id}:`, err.message);
    }
  }

  console.log(`[loanReminder] Done — ${sent} reminder(s) sent`);
}

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', processLoanReminders);

module.exports = { processLoanReminders };
