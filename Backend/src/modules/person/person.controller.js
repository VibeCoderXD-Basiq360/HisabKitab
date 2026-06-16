const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const people = await prisma.person.findMany({
    where: { userId: req.user.userId },
    orderBy: { name: 'asc' },
  });
  res.json(people);
};

async function resolveLinkedUser(email) {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.id || null;
}

const create = async (req, res) => {
  const { name, email } = req.body;
  const linkedUserId = await resolveLinkedUser(email);
  const person = await prisma.person.create({
    data: { userId: req.user.userId, name, email: email || null, linkedUserId },
  });
  res.status(201).json(person);
};

const update = async (req, res) => {
  const existing = await prisma.person.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  const { name, email } = req.body;
  const linkedUserId = await resolveLinkedUser(email);
  const person = await prisma.person.update({
    where: { id: req.params.id },
    data: { name, email: email || null, linkedUserId },
  });
  res.json(person);
};

const remove = async (req, res) => {
  const existing = await prisma.person.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Person not found' });

  await prisma.person.delete({ where: { id: req.params.id } });
  res.status(204).end();
};

module.exports = { list, create, update, remove };
