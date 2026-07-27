const prisma = require('../../lib/prisma');
const { notify } = require('../../lib/notify');

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
  const senderId = req.user.userId;
  const linkedUserId = await resolveLinkedUser(email);

  if (linkedUserId) {
    // Email belongs to a registered user — send a ContactRequest instead
    if (linkedUserId === senderId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const duplicate = await prisma.contactRequest.findFirst({
      where: { senderId, recipientEmail: email, status: 'PENDING' },
    });
    if (duplicate) return res.status(409).json({ error: 'You already sent a request to this person' });

    const alreadyLinked = await prisma.person.findFirst({
      where: { userId: senderId, linkedUserId },
    });
    if (alreadyLinked) return res.status(409).json({ error: 'Already connected with this person' });

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });

    const request = await prisma.contactRequest.create({
      data: { senderId, recipientId: linkedUserId, recipientEmail: email },
    });

    await notify(linkedUserId, null, {
      title: '👤 Contact Request',
      body: `${sender.name || sender.email} wants to add you as a contact`,
      data: { type: 'CONTACT_REQUEST', requestId: request.id },
    });

    return res.status(202).json({ contactRequest: true });
  }

  // No linked user — create a plain offline/manual person
  const person = await prisma.person.create({
    data: { userId: senderId, name, email: email || null, linkedUserId: null },
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
