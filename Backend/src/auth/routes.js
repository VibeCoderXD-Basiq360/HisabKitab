import { Router } from 'express';
import { requireAuth } from '../session.js';
import { register, login, logout, getCurrentUser, changePassword } from './handlers.js';

export const authRouter = Router();

authRouter.post('/auth/register', register);
authRouter.post('/auth/login', login);
authRouter.post('/auth/logout', requireAuth, logout);
authRouter.get('/auth/me', requireAuth, getCurrentUser);
authRouter.post('/auth/password', requireAuth, changePassword);
