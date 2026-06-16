const prisma = require('../../lib/prisma');
const { getIconForCategory } = require('../../utils/iconMap');

const list = async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { userId: req.user.userId },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
};

const create = async (req, res) => {
  const { name } = req.body;
  const auto = getIconForCategory(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const category = await prisma.category.create({
    data: { userId: req.user.userId, name, color, icon },
  });
  res.status(201).json(category);
};

const update = async (req, res) => {
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const { name } = req.body;
  const auto = getIconForCategory(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, color, icon },
  });
  res.json(category);
};

const remove = async (req, res) => {
  const existing = await prisma.category.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, create, update, remove };
