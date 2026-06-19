const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { notify } = require('../lib/notify');
const { sendEmail } = require('../lib/mailer');

const prisma = new PrismaClient();

function getNextDueDate(paymentDueDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);
  thisMonth.setHours(0, 0, 0, 0);
  if (thisMonth >= today) return thisMonth;
  return new Date(today.getFullYear(), today.getMonth() + 1, paymentDueDay);
}

function getBillingCycle(billingCycleDay) {
  const today = new Date();
  const d = today.getDate();
  let start, end;
  if (d >= billingCycleDay) {
    start = new Date(today.getFullYear(), today.getMonth(), billingCycleDay);
    end   = new Date(today.getFullYear(), today.getMonth() + 1, billingCycleDay - 1);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() - 1, billingCycleDay);
    end   = new Date(today.getFullYear(), today.getMonth(), billingCycleDay - 1);
  }
  return { start, end };
}

function fmtDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function processCreditCardReminders() {
  console.log('[creditCardReminder] Running…');

  const cards = await prisma.paymentType.findMany({
    where: { cardType: 'CREDIT_CARD', reminderEnabled: true, paymentDueDay: { not: null } },
    include: { user: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const card of cards) {
    try {
      const dueDate = getNextDueDate(card.paymentDueDay);
      const daysUntilDue = Math.round((dueDate - today) / 86400000);

      const triggerDays = new Set([card.reminderDaysBefore, 0].filter((d) => d !== null && d >= 0));
      if (!triggerDays.has(daysUntilDue)) continue;

      let title, body;
      if (daysUntilDue === 0) {
        title = `${card.name} payment due TODAY`;
        body  = `Your ${card.name} credit card bill is due today (${fmtDate(dueDate)}). Pay now to avoid late charges.`;
      } else {
        title = `${card.name} bill due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
        body  = `Your ${card.name} credit card payment is due on ${fmtDate(dueDate)}. Don't miss it!`;
      }

      await notify(card.userId, card.user.fcmToken, {
        title,
        body,
        data: { type: 'CREDIT_CARD_DUE', paymentTypeId: card.id, daysUntilDue: String(daysUntilDue) },
      });

      if (card.user.email) {
        const cycle = card.billingCycleDay ? getBillingCycle(card.billingCycleDay) : null;
        const cycleHtml = cycle
          ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Billing cycle: ${fmtDate(cycle.start)} – ${fmtDate(cycle.end)}</p>`
          : '';

        await sendEmail({
          to: card.user.email,
          subject: title,
          html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:${daysUntilDue === 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : daysUntilDue <= 3 ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)'};padding:28px 24px;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,.75);letter-spacing:.05em;text-transform:uppercase;">HisabKitab · Credit Card Alert</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff;">${title}</h1>
    </div>
    <div style="padding:20px 24px;">
      <p style="margin:0;font-size:15px;color:#374151;">${body}</p>
      ${cycleHtml}
      <div style="margin-top:20px;text-align:center;">
        <a href="${process.env.CLIENT_URL || 'https://hisabkitab.app'}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">Open HisabKitab</a>
      </div>
    </div>
  </div>
</body></html>`,
        });
      }

      sent++;
    } catch (err) {
      console.error(`[creditCardReminder] Failed for card ${card.id}:`, err.message);
    }
  }

  console.log(`[creditCardReminder] Done — ${sent} reminder(s) sent`);
}

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', processCreditCardReminders);

module.exports = { processCreditCardReminders };
