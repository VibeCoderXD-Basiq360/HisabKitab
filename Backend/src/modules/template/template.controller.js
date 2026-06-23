const prisma = require('../../lib/prisma');

const TEMPLATE_INCLUDE = {
  category:    { select: { id: true, name: true, icon: true, color: true } },
  paymentType: { select: { id: true, name: true, icon: true, color: true } },
};

const list = async (req, res) => {
  const userId = req.user.userId;
  const templates = await prisma.expenseTemplate.findMany({
    where: { userId },
    include: TEMPLATE_INCLUDE,
    orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json(templates);
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { title, emoji, amount, categoryId, paymentTypeId, note } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const template = await prisma.expenseTemplate.create({
    data: {
      userId,
      title,
      emoji: emoji || null,
      amount: amount != null ? Number(amount) : null,
      categoryId: categoryId || null,
      paymentTypeId: paymentTypeId || null,
      note: note || null,
    },
    include: TEMPLATE_INCLUDE,
  });
  res.status(201).json(template);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { title, emoji, amount, categoryId, paymentTypeId, note } = req.body;

  const existing = await prisma.expenseTemplate.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const template = await prisma.expenseTemplate.update({
    where: { id },
    data: {
      title: title ?? existing.title,
      emoji: emoji !== undefined ? (emoji || null) : existing.emoji,
      amount: amount !== undefined ? (amount != null ? Number(amount) : null) : existing.amount,
      categoryId: categoryId !== undefined ? (categoryId || null) : existing.categoryId,
      paymentTypeId: paymentTypeId !== undefined ? (paymentTypeId || null) : existing.paymentTypeId,
      note: note !== undefined ? (note || null) : existing.note,
    },
    include: TEMPLATE_INCLUDE,
  });
  res.json(template);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const existing = await prisma.expenseTemplate.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.expenseTemplate.delete({ where: { id } });
  res.json({ ok: true });
};

const use = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const existing = await prisma.expenseTemplate.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const template = await prisma.expenseTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
    include: TEMPLATE_INCLUDE,
  });
  res.json(template);
};

module.exports = { list, create, update, remove, use };
