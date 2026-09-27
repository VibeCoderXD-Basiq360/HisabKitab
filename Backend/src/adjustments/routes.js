import { Router } from 'express';
import { requireAuth } from '../session.js';
import { getAdjustments, createAdjustment } from './handlers.js';

export const adjustmentsRouter = Router();

adjustmentsRouter.get('/accounts/:id/adjustments', requireAuth, getAdjustments);
adjustmentsRouter.post('/accounts/:id/adjustments', requireAuth, createAdjustment);
