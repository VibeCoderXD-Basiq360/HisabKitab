const { getQueue } = require('../lib/queue');
const { processBudgetAlerts }           = require('./budgetAlert');
const { processCreditCardReminders }    = require('./creditCardReminder');
const { processSubscriptionReminders }  = require('./subscriptionReminder');
const { refreshAllUsers }               = require('./exchangeRateRefresh');
const { processLoanReminders }          = require('./loanReminder');
const { sendMonthlyReports }            = require('./monthlyReport');

// Wraps any async job so pg-boss gets a clean rejection on failure (enables retry)
function wrap(fn, name) {
  return async () => {
    console.log(`[queue] Starting job: ${name}`);
    try {
      await fn();
    } catch (err) {
      console.error(`[queue] Job ${name} failed:`, err.message);
      throw err;
    }
  };
}

async function startJobs() {
  const boss = getQueue();

  try {
    await boss.start();
    console.log('[queue] pg-boss started');
  } catch (err) {
    console.error('[queue] pg-boss failed to start — falling back to no-op:', err.message);
    return; // don't crash the server if pg-boss tables aren't set up yet
  }

  const QUEUES = ['budgetAlert', 'creditCardReminder', 'subscriptionReminder', 'exchangeRateRefresh', 'loanReminder', 'monthlyReport'];

  // pg-boss v10: queues must be created before work()/schedule()
  await Promise.all(QUEUES.map((q) => boss.createQueue(q)));

  // Register workers (one job at a time per queue, pg-boss serializes)
  await boss.work('budgetAlert',          { teamSize: 1 }, wrap(processBudgetAlerts,          'budgetAlert'));
  await boss.work('creditCardReminder',   { teamSize: 1 }, wrap(processCreditCardReminders,   'creditCardReminder'));
  await boss.work('subscriptionReminder', { teamSize: 1 }, wrap(processSubscriptionReminders, 'subscriptionReminder'));
  await boss.work('exchangeRateRefresh',  { teamSize: 1 }, wrap(refreshAllUsers,               'exchangeRateRefresh'));
  await boss.work('loanReminder',         { teamSize: 1 }, wrap(processLoanReminders,          'loanReminder'));
  await boss.work('monthlyReport',        { teamSize: 1 }, wrap(sendMonthlyReports,            'monthlyReport'));

  // Schedule recurring jobs (idempotent — safe to call on every restart)
  // pg-boss cron format: minute hour day-of-month month day-of-week
  await boss.schedule('budgetAlert',          '0 9 * * *',  {}, { tz: 'Asia/Kolkata' });
  await boss.schedule('creditCardReminder',   '0 9 * * *',  {}, { tz: 'Asia/Kolkata' });
  await boss.schedule('subscriptionReminder', '0 9 * * *',  {}, { tz: 'Asia/Kolkata' });
  await boss.schedule('exchangeRateRefresh',  '0 9 * * *',  {}, { tz: 'Asia/Kolkata' });
  await boss.schedule('loanReminder',         '0 9 * * *',  {}, { tz: 'Asia/Kolkata' });
  await boss.schedule('monthlyReport',        '0 9 1 * *',  {}, { tz: 'Asia/Kolkata' });

  console.log('[queue] All 6 jobs scheduled via pg-boss');
}

module.exports = { startJobs };
