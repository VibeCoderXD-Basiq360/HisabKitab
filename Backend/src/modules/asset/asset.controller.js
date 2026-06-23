const prisma = require('../../lib/prisma');

const VALID_TYPES = ['CASH', 'BANK', 'INVESTMENT', 'PROPERTY', 'VEHICLE', 'OTHER'];

const list = async (req, res) => {
  const userId = req.user.userId;
  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(assets);
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { name, emoji, type, value, note } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (value === undefined || isNaN(Number(value))) return res.status(400).json({ error: 'value is required' });
  if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });

  const asset = await prisma.asset.create({
    data: {
      userId,
      name: name.trim(),
      emoji: emoji || null,
      type: type || 'OTHER',
      value: Number(value),
      note: note || null,
    },
  });
  res.status(201).json(asset);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { name, emoji, type, value, note } = req.body;

  const existing = await prisma.asset.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      name:  name  !== undefined ? name.trim()       : existing.name,
      emoji: emoji !== undefined ? (emoji || null)   : existing.emoji,
      type:  type  !== undefined ? type              : existing.type,
      value: value !== undefined ? Number(value)     : existing.value,
      note:  note  !== undefined ? (note || null)    : existing.note,
    },
  });
  res.json(asset);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const existing = await prisma.asset.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.asset.delete({ where: { id } });
  res.json({ ok: true });
};

module.exports = { list, create, update, remove };
