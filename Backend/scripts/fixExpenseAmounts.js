require('dotenv').config();
const prisma = require('../src/lib/prisma');

const ADITYA_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  // For each of Aditya's expenses with splits, compute the correct amount:
  // originalAmount = splitAmount * (number_of_splits + 1)
  // currentOwed    = sum of all PENDING/PAYMENT_REQUESTED split amounts
  // correctAmount  = payer's own share + currentOwed
  // payer's own share is always: originalAmount / (splits.length + 1)
  // But simpler: correctAmount = originalAmount - sum of CONFIRMED splits

  const expenses = await prisma.expense.findMany({
    where: { userId: ADITYA_ID, splits: { some: {} } },
    include: { splits: true },
  });

  for (const e of expenses) {
    const confirmedTotal = e.splits
      .filter((s) => s.status === 'CONFIRMED')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const allSplitsTotal = e.splits.reduce((sum, s) => sum + Number(s.amount), 0);
    const splitCount = e.splits.length;
    // Original amount = total per split * (splits + 1) since payer's share = same as each ower
    const perShare = Number(e.splits[0]?.amount) || 0;
    const originalAmount = perShare * (splitCount + 1);
    const correctAmount = originalAmount - confirmedTotal;

    const currentAmount = Number(e.amount);

    if (Math.abs(currentAmount - correctAmount) > 0.01) {
      console.log(`\n${e.title}`);
      console.log(`  splits: ${splitCount}, perShare: ₹${perShare}`);
      console.log(`  originalAmount: ₹${originalAmount}`);
      console.log(`  confirmedTotal: ₹${confirmedTotal}`);
      console.log(`  currentAmount:  ₹${currentAmount}  →  correctAmount: ₹${correctAmount}`);

      await prisma.expense.update({
        where: { id: e.id },
        data: { amount: correctAmount },
      });
      console.log(`  ✓ Fixed`);
    } else {
      console.log(`${e.title}: ₹${currentAmount} is correct`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
