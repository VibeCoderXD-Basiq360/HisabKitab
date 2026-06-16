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

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/people', personRoutes);
app.use('/api/payment-types', paymentTypeRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/recurring', recurringRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
