import { Router } from 'express';
import { pool } from './db.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ error: 'Database unreachable' });
  }
});
