const prisma = require('../../lib/prisma');
const { getIconForPaymentType } = require('../../utils/iconMap');

const list = async (req, res) => {
  const types = await prisma.paymentType.findMany({
    where: { userId: req.user.userId },
    orderBy: { name: 'asc' },
    include: { linkedAccount: { select: { id: true, name: true, type: true } } },
  });
  res.json(types);
};

function cardFields(body) {
  const { cardType, billingCycleDay, paymentDueDay, reminderDaysBefore, reminderEnabled, cardLastFour, cardHolderName, cardExpiry } = body;
  const isCard = cardType === 'CREDIT_CARD' || cardType === 'DEBIT_CARD';
  return {
    cardType: cardType || null,
    billingCycleDay:    billingCycleDay ? Number(billingCycleDay) : null,
    paymentDueDay:      paymentDueDay   ? Number(paymentDueDay)   : null,
    reminderDaysBefore: reminderDaysBefore ? Number(reminderDaysBefore) : null,
    reminderEnabled:    !!reminderEnabled,
    cardLastFour:    isCard && cardLastFour   ? String(cardLastFour).replace(/\D/g, '').slice(-4) : null,
    cardHolderName:  isCard && cardHolderName ? cardHolderName.trim() : null,
    cardExpiry:      isCard && cardExpiry     ? cardExpiry.trim()     : null,
  };
}

const create = async (req, res) => {
  const { name, linkedAccountId } = req.body;
  const auto = getIconForPaymentType(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const type = await prisma.paymentType.create({
    data: { userId: req.user.userId, name, icon, color, linkedAccountId: linkedAccountId || null, ...cardFields(req.body) },
    include: { linkedAccount: { select: { id: true, name: true, type: true } } },
  });
  res.status(201).json(type);
};

const update = async (req, res) => {
  const existing = await prisma.paymentType.findFirst({
    where: { id: req.params.id, userId: req.user.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Payment type not found' });

  const { name, linkedAccountId } = req.body;
  const auto = getIconForPaymentType(name);
  const icon = req.body.icon || auto.icon;
  const color = req.body.color || auto.color;
  const type = await prisma.paymentType.update({
    where: { id: req.params.id },
    data: { name, icon, color, linkedAccountId: linkedAccountId || null, ...cardFields(req.body) },
    include: { linkedAccount: { select: { id: true, name: true, type: true } } },
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
