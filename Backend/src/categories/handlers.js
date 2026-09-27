import {
  listActiveCategories,
  findCategory,
  insertCategory,
  updateCategory,
  setCategoryArchived,
} from './queries.js';
import { isId, unknownFieldError } from '../fields.js';

// The same eight names are checked by the database in 004_categories.sql.
// tests/categories.test.mjs fails if the two lists ever differ.
export const COLOURS = ['saffron', 'sand', 'rose', 'plum', 'indigo', 'sky', 'teal', 'slate'];
const CATEGORY_FIELDS = ['name', 'colour'];

// Used for both create and edit. Edit merges the request over the current
// category first, so every field is always checked the same way.
function readCategoryFields(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) return { error: 'Enter a name' };
  if (!COLOURS.includes(input.colour)) return { error: `colour must be one of ${COLOURS.join(', ')}` };
  return { name, colour: input.colour };
}

function duplicateNameError(name) {
  return { error: `You already have a category called "${name}"` };
}

// Sends the 404 itself, so callers only need to stop when this returns nothing.
async function loadCategory(req, res) {
  const category = isId(req.params.id) ? await findCategory(req.params.id, req.user.id) : undefined;
  if (!category) res.status(404).json({ error: 'Category not found' });
  return category;
}

export async function listCategories(req, res) {
  res.json(await listActiveCategories(req.user.id));
}

export async function createCategory(req, res) {
  const unknown = unknownFieldError(req.body ?? {}, CATEGORY_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readCategoryFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    res.status(201).json(await insertCategory(req.user.id, fields));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json(duplicateNameError(fields.name));
    throw error;
  }
}

export async function editCategory(req, res) {
  const category = await loadCategory(req, res);
  if (!category) return;
  if (category.archived_at) return res.status(409).json({ error: 'This category is archived and cannot be edited' });

  const unknown = unknownFieldError(req.body ?? {}, CATEGORY_FIELDS);
  if (unknown) return res.status(400).json(unknown);
  const fields = readCategoryFields({ name: category.name, colour: category.colour, ...req.body });
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    res.json(await updateCategory(category.id, req.user.id, fields));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json(duplicateNameError(fields.name));
    throw error;
  }
}

export async function archiveCategory(req, res) {
  const category = await loadCategory(req, res);
  if (!category) return;
  if (category.archived_at) return res.status(409).json({ error: 'This category is already archived' });

  await setCategoryArchived(category.id, req.user.id);
  res.status(204).end();
}
