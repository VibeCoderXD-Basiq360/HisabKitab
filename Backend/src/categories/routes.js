import { Router } from 'express';
import { requireAuth } from '../session.js';
import { listCategories, createCategory, editCategory, archiveCategory } from './handlers.js';

export const categoriesRouter = Router();

categoriesRouter.get('/categories', requireAuth, listCategories);
categoriesRouter.post('/categories', requireAuth, createCategory);
categoriesRouter.patch('/categories/:id', requireAuth, editCategory);
categoriesRouter.post('/categories/:id/archive', requireAuth, archiveCategory);
