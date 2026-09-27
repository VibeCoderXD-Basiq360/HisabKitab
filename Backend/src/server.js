import express from 'express';
import { healthRouter } from './health.js';

const app = express();

app.use('/api', healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 calls this on failure too, e.g. when the port is already taken.
app.listen(process.env.PORT, (error) => {
  if (error) throw error;
  console.log(`Listening on port ${process.env.PORT}`);
});
