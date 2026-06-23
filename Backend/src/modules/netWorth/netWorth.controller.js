const prisma = require('../../lib/prisma');

const ACTIVE_SPLIT = ['PENDING', 'PAYMENT_REQUESTED'];

const getNetWorth = async (req, res) => {
  const userId = req.user.userId;

  const [assets, loans, owedToMeSplits, iOweSplits] = await Promise.all([
    // User's manual assets
    prisma.asset.findMany({ where: { userId }, orderBy: [{ type: 'asc' }, { createdAt: 'asc' }] }),

    // Active loans (liabilities)
    prisma.loan.findMany({
      where: { userId, isActive: true },
      include: { payments: { select: { amount: true } } },
    }),

    // Splits where others owe me (receivables — treat as assets)
    prisma.expenseSplit.findMany({
      where: { expense: { userId }, status: { in: ACTIVE_SPLIT } },
      select: { amount: true, person: { select: { name: true } } },
    }),

    // Splits where I owe others (liabilities)
    prisma.expenseSplit.findMany({
      where: { person: { linkedUserId: userId }, status: { in: ACTIVE_SPLIT } },
      select: { amount: true, expense: { select: { user: { select: { name: true } } } } },
    }),
  ]);

  // Compute outstanding loan balance per loan
  const loanLiabilities = loans.map((loan) => {
    const paid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Math.max(0, Number(loan.principal) - paid);
    return { id: loan.id, name: loan.name, type: 'loan', value: outstanding, note: `${loan.interestRate}% · ${loan.tenureMonths}mo EMI` };
  }).filter((l) => l.value > 0);

  // Splits I owe — group as single liability
  const totalIOwe = iOweSplits.reduce((sum, s) => sum + Number(s.amount), 0);
  const splitLiabilities = totalIOwe > 0
    ? [{ id: 'splits-owe', name: 'Pending split payments', type: 'split', value: totalIOwe, note: `${iOweSplits.length} split(s)` }]
    : [];

  // Splits owed to me — treat as receivable asset
  const totalOwedToMe = owedToMeSplits.reduce((sum, s) => sum + Number(s.amount), 0);
  const splitReceivable = totalOwedToMe > 0
    ? [{ id: 'splits-recv', name: 'Split receivables', type: 'RECEIVABLE', value: totalOwedToMe, note: `${owedToMeSplits.length} split(s) pending` }]
    : [];

  // Asset breakdown by type
  const assetsByType = {};
  for (const a of assets) {
    assetsByType[a.type] = (assetsByType[a.type] || 0) + Number(a.value);
  }

  const totalManualAssets  = assets.reduce((sum, a) => sum + Number(a.value), 0);
  const totalReceivables   = totalOwedToMe;
  const totalAssets        = totalManualAssets + totalReceivables;

  const totalLoanLiab      = loanLiabilities.reduce((sum, l) => sum + l.value, 0);
  const totalSplitLiab     = totalIOwe;
  const totalLiabilities   = totalLoanLiab + totalSplitLiab;

  const netWorth = totalAssets - totalLiabilities;

  res.json({
    assets:           [...assets.map((a) => ({ ...a, value: Number(a.value) })), ...splitReceivable],
    liabilities:      [...loanLiabilities, ...splitLiabilities],
    assetsByType,
    totalAssets,
    totalLiabilities,
    netWorth,
    // sub-totals for UI
    totalManualAssets,
    totalReceivables,
    totalLoanLiabilities: totalLoanLiab,
    totalSplitLiabilities: totalSplitLiab,
  });
};

module.exports = { getNetWorth };
