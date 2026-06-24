const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { businessId: req.businessId },
    include: { _count: { select: { jobs: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(customers);
};

const create = async (req, res) => {
  const { name, phone, email, note } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const c = await prisma.customer.create({
    data: { businessId: req.businessId, name: name.trim(), phone: phone || null, email: email || null, note: note || null },
  });
  res.status(201).json(c);
};

const update = async (req, res) => {
  const { name, phone, email, note } = req.body;
  const c = await prisma.customer.updateMany({
    where: { id: req.params.id, businessId: req.businessId },
    data: {
      ...(name  !== undefined && { name: name.trim() }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(note  !== undefined && { note: note || null }),
    },
  });
  res.json(c);
};

const getDetail = async (req, res) => {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, businessId: req.businessId },
    include: {
      jobs: {
        select: { id: true, title: true, status: true, orderDate: true, actualPrice: true, trueCost: true, profit: true },
        orderBy: { orderDate: 'desc' },
      },
    },
  });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
};

module.exports = { list, create, update, getDetail };
