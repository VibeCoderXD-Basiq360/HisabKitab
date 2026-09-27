import express from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth/routes.js';
import { accountsRouter } from './accounts/routes.js';
import { categoriesRouter } from './categories/routes.js';
import { transfersRouter } from './transfers/routes.js';

const app = express();

app.use(express.json());
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', accountsRouter);
app.use('/api', categoriesRouter);
app.use('/api', transfersRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express only treats this as an error handler because it takes four parameters.
app.use((error, req, res, next) => {
  // Only express.json raises these: the body was malformed or too large.
  if (error.expose) return res.status(error.status).json({ error: 'Request body could not be read' });
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
});

// Express 5 calls this on failure too, e.g. when the port is already taken.
app.listen(process.env.PORT, (error) => {
  if (error) throw error;
  console.log(`Listening on port ${process.env.PORT}`);
});
