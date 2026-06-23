const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const expenseRoutes = require('./modules/expense/expense.routes');
const categoryRoutes = require('./modules/category/category.routes');
const personRoutes = require('./modules/person/person.routes');
const paymentTypeRoutes = require('./modules/paymentType/paymentType.routes');
const splitsRoutes = require('./modules/splits/splits.routes');
const recurringRoutes = require('./modules/recurring/recurring.routes');
const budgetRoutes = require('./modules/budget/budget.routes');
const bulkPaymentRoutes = require('./modules/bulkPayment/bulkPayment.routes');
const groupRoutes = require('./modules/group/group.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const activityRoutes = require('./modules/activity/activity.routes');
const savingsGoalRoutes = require('./modules/savingsGoal/savingsGoal.routes');
const loanRoutes = require('./modules/loan/loan.routes');
const exchangeRateRoutes = require('./modules/exchangeRate/exchangeRate.routes');
const cardDelegationRoutes = require('./modules/cardDelegation/cardDelegation.routes');
const webauthnRoutes       = require('./modules/auth/webauthn.routes');
const pinResetRoutes       = require('./modules/auth/pinReset.routes');
const sharedTabRoutes      = require('./modules/sharedTab/sharedTab.routes');
const tabGroupRoutes       = require('./modules/tabGroup/tabGroup.routes');
const contactRoutes        = require('./modules/contact/contact.routes');
const searchRoutes         = require('./modules/search/search.routes');
const incomeRoutes         = require('./modules/income/income.routes');
const subscriptionRoutes   = require('./modules/subscription/subscription.routes');
const insightsRoutes       = require('./modules/insights/insights.routes');
const templateRoutes       = require('./modules/template/template.routes');
const financialGoalRoutes  = require('./modules/financialGoal/financialGoal.routes');
const assetRoutes          = require('./modules/asset/asset.routes');
const netWorthRoutes       = require('./modules/netWorth/netWorth.routes');
const ocrRoutes            = require('./modules/ocr/ocr.routes');
const accountRoutes        = require('./modules/account/account.routes');

// Start scheduled jobs
require('./jobs/monthlyReport');
require('./jobs/creditCardReminder');
require('./jobs/subscriptionReminder');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/people', personRoutes);
app.use('/api/payment-types', paymentTypeRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/bulk-payments', bulkPaymentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/savings-goal', savingsGoalRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/card-delegations', cardDelegationRoutes);
app.use('/api/auth/webauthn',    webauthnRoutes);
app.use('/api/auth/pin-reset',  pinResetRoutes);
app.use('/api/shared-tabs',     sharedTabRoutes);
app.use('/api/tab-groups',      tabGroupRoutes);
app.use('/api/contacts',        contactRoutes);
app.use('/api/search',          searchRoutes);
app.use('/api/income',          incomeRoutes);
app.use('/api/subscriptions',   subscriptionRoutes);
app.use('/api/insights',        insightsRoutes);
app.use('/api/templates',       templateRoutes);
app.use('/api/financial-goals', financialGoalRoutes);
app.use('/api/assets',         assetRoutes);
app.use('/api/net-worth',      netWorthRoutes);
app.use('/api/ocr',            ocrRoutes);
app.use('/api/accounts',       accountRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
