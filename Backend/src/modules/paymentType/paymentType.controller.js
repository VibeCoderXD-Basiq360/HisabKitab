const prisma = require('../../lib/prisma');
const { getIconForPaymentType } = require('../../utils/iconMap');

const list = async (req, res) => {
  const types = await prisma.paymentType.findMany({
    where: { userId: req.user.userId },
    orderBy: { name: 'asc' },
  });
  res.json(types);
};

const create = async (req, res) => {
  const { name } = req.body;
  const auto = getIconForPaymentType(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const type = await prisma.paymentType.create({
    data: { userId: req.user.userId, name, icon, color },
  });
  res.status(201).json(type);
};

const update = async (req, res) => {
  const existing = await prisma.paymentType.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Payment type not found' });

  const { name } = req.body;
  const auto = getIconForPaymentType(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const type = await prisma.paymentType.update({
    where: { id: req.params.id },
    data: { name, icon, color },
  });
  res.json(type);
};

const remove = async (req, res) => {
  const existing = await prisma.paymentType.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Payment type not found' });

  await prisma.paymentType.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, create, update, remove };
