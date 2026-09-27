import { Router } from 'express';
import { requireAuth } from '../session.js';
import { getTransfers, createTransfer, editTransfer, deleteTransfer } from './handlers.js';

export const transfersRouter = Router();

transfersRouter.get('/transfers', requireAuth, getTransfers);
transfersRouter.post('/transfers', requireAuth, createTransfer);
transfersRouter.patch('/transfers/:id', requireAuth, editTransfer);
transfersRouter.delete('/transfers/:id', requireAuth, deleteTransfer);
