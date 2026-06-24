const prisma = require('../../lib/prisma');

const getPL = async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate   = to   ? new Date(to)   : new Date();

  const [jobs, expenses, withdrawals, partners] = await Promise.all([
    prisma.job.findMany({
      where: { businessId: req.businessId, status: { in: ['DELIVERED', 'PRINTED'] },
        orderDate: { gte: fromDate, lte: toDate } },
      select: { id: true, title: true, actualPrice: true, trueCost: true, profit: true, marginPct: true,
        materialCost: true, electricityCost: true, depreciationCost: true, labourCost: true,
        packagingCost: true, addOnsCost: true, failureMarkup: true, deliveryCost: true, orderDate: true,
        customer: { select: { name: true } }, location: { select: { name: true } } },
    }),
    prisma.businessExpense.findMany({
      where: { businessId: req.businessId, date: { gte: fromDate, lte: toDate } },
      select: { id: true, category: true, amount: true, date: true, vendor: true },
    }),
    prisma.partnerWithdrawal.findMany({
      where: { partner: { businessId: req.businessId }, date: { gte: fromDate, lte: toDate } },
      include: { partner: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.businessPartner.findMany({
      where: { businessId: req.businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const n = (v) => Number(v) || 0;
  const revenue     = jobs.reduce((s, j) => s + n(j.actualPrice ?? j.suggestedPrice), 0);
  const cogs        = jobs.reduce((s, j) => s + n(j.trueCost), 0);
  const grossProfit = revenue - cogs;
  const opExpenses  = expenses.reduce((s, e) => s + n(e.amount), 0);
  const netProfit   = grossProfit - opExpenses;

  const partnerSplits = partners.map((p) => ({
    partner: p,
    share: (netProfit * n(p.profitSharePct)) / 100,
    withdrawn: withdrawals.filter(w => w.partnerId === p.id).reduce((s, w) => s + n(w.amount), 0),
  }));

  const costBreakdown = {
    material:    jobs.reduce((s, j) => s + n(j.materialCost), 0),
    electricity: jobs.reduce((s, j) => s + n(j.electricityCost), 0),
    depreciation:jobs.reduce((s, j) => s + n(j.depreciationCost), 0),
    labour:      jobs.reduce((s, j) => s + n(j.labourCost), 0),
    packaging:   jobs.reduce((s, j) => s + n(j.packagingCost), 0),
    addOns:      jobs.reduce((s, j) => s + n(j.addOnsCost), 0),
    failureMarkup: jobs.reduce((s, j) => s + n(j.failureMarkup), 0),
    delivery:    jobs.reduce((s, j) => s + n(j.deliveryCost), 0),
  };

  res.json({ period: { from: fromDate, to: toDate },
    revenue, cogs, grossProfit, opExpenses, netProfit,
    jobCount: jobs.length, avgMarginPct: jobs.length
      ? jobs.reduce((s, j) => s + n(j.marginPct), 0) / jobs.length : 0,
    costBreakdown, partnerSplits, jobs, expenses, withdrawals });
};

module.exports = { getPL };
