const cron = require('node-cron');
const prisma = require('../lib/prisma');
const notify = require('../lib/notify');

// Daily at 9am — send FCM for subscriptions due in ≤3 days
cron.schedule('0 9 * * *', async () => {
  try {
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const dueSoon = await prisma.subscription.findMany({
      where: { isActive: true, nextDueDate: { gte: now, lte: in3days } },
      include: { user: { select: { id: true, fcmToken: true } } },
    });

    for (const sub of dueSoon) {
      const daysLeft = Math.ceil((new Date(sub.nextDueDate) - now) / (1000 * 60 * 60 * 24));
      await notify(sub.userId, sub.user.fcmToken, {
        title: `${sub.name} due ${daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`}`,
        body:  `₹${Number(sub.amount).toLocaleString('en-IN')} — ${sub.billingCycle.toLowerCase()} subscription`,
        type:  'subscription_due',
        data:  { subscriptionId: sub.id },
      });
    }
  } catch (err) {
    console.error('[subscriptionReminder]', err.message);
  }
});
