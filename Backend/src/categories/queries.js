import { pool } from '../db.js';

export async function listActiveCategories(userId) {
  const result = await pool.query(
    `SELECT id, name, colour
     FROM categories
     WHERE user_id = $1 AND archived_at IS NULL
     ORDER BY created_at, id`,
    [userId],
  );
  return result.rows;
}

export async function findCategory(categoryId, userId) {
  const result = await pool.query(
    'SELECT id, name, colour, archived_at FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId],
  );
  return result.rows[0];
}

export async function insertCategory(userId, { name, colour }) {
  const result = await pool.query(
    `INSERT INTO categories (user_id, name, colour)
     VALUES ($1, $2, $3)
     RETURNING id, name, colour`,
    [userId, name, colour],
  );
  return result.rows[0];
}

export async function updateCategory(categoryId, userId, { name, colour }) {
  const result = await pool.query(
    `UPDATE categories SET name = $3, colour = $4
     WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
     RETURNING id, name, colour`,
    [categoryId, userId, name, colour],
  );
  return result.rows[0];
}

export async function setCategoryArchived(categoryId, userId) {
  await pool.query(
    'UPDATE categories SET archived_at = now() WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
    [categoryId, userId],
  );
}
