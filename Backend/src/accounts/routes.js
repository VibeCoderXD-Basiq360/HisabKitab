import { Router } from 'express';
import { requireAuth } from '../session.js';
import {
  listAccounts,
  createAccount,
  getAccount,
  editAccount,
  archiveAccount,
  getLedger,
} from './handlers.js';

export const accountsRouter = Router();

accountsRouter.get('/accounts', requireAuth, listAccounts);
accountsRouter.post('/accounts', requireAuth, createAccount);
accountsRouter.get('/accounts/:id', requireAuth, getAccount);
accountsRouter.patch('/accounts/:id', requireAuth, editAccount);
accountsRouter.post('/accounts/:id/archive', requireAuth, archiveAccount);
accountsRouter.get('/accounts/:id/ledger', requireAuth, getLedger);
