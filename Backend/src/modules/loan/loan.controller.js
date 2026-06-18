const prisma = require('../../lib/prisma');

function calcEMI(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

const list = async (req, res) => {
  const userId = req.user.userId;
  const loans = await prisma.loan.findMany({
    where: { userId },
    include: { payments: { select: { month: true, amount: true, paidAt: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(loans);
};

const create = async (req, res) => {
  const userId = req.user.userId;
  const { name, principal, interestRate, tenureMonths, startDate } = req.body;

  if (!name || !principal || interestRate === undefined || !tenureMonths || !startDate) {
    return res.status(400).json({ error: 'name, principal, interestRate, tenureMonths, startDate are required' });
  }

  const emiAmount = calcEMI(Number(principal), Number(interestRate), Number(tenureMonths));

  const loan = await prisma.loan.create({
    data: {
      userId,
      name,
      principal: Number(principal),
      interestRate: Number(interestRate),
      tenureMonths: Number(tenureMonths),
      startDate: new Date(startDate),
      emiAmount: Math.round(emiAmount * 100) / 100,
    },
    include: { payments: true },
  });

  res.status(201).json(loan);
};

const getOne = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const loan = await prisma.loan.findFirst({
    where: { id, userId },
    include: { payments: { orderBy: { month: 'asc' } } },
  });

  if (!loan) return res.status(404).json({ error: 'Not found' });
  res.json(loan);
};

const update = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { name, isActive } = req.body;

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.loan.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { payments: { orderBy: { month: 'asc' } } },
  });

  res.json(updated);
};

const remove = async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) return res.status(404).json({ error: 'Not found' });

  await prisma.loan.delete({ where: { id } });
  res.json({ ok: true });
};

const markPaid = async (req, res) => {
  const userId = req.user.userId;
  const { id, month } = req.params;
  const { note } = req.body;

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) return res.status(404).json({ error: 'Not found' });

  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > loan.tenureMonths) {
    return res.status(400).json({ error: 'Invalid month' });
  }

  const payment = await prisma.loanPayment.upsert({
    where: { loanId_month: { loanId: id, month: monthNum } },
    create: { loanId: id, month: monthNum, amount: loan.emiAmount, note: note || null },
    update: { paidAt: new Date(), note: note || null },
  });

  res.json(payment);
};

const markUnpaid = async (req, res) => {
  const userId = req.user.userId;
  const { id, month } = req.params;

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) return res.status(404).json({ error: 'Not found' });

  await prisma.loanPayment.deleteMany({ where: { loanId: id, month: Number(month) } });
  res.json({ ok: true });
};

module.exports = { list, create, getOne, update, remove, markPaid, markUnpaid };
