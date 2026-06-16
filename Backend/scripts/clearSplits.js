require('dotenv').config();
const prisma = require('../src/lib/prisma');

const ADITYA_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  // Delete payment requests → splits → split expenses (in dependency order)
  const splits = await prisma.expenseSplit.findMany({
    where: { expense: { userId: ADITYA_ID } },
    select: { id: true },
  });
  const splitIds = splits.map((s) => s.id);

  const prDel = await prisma.paymentRequest.deleteMany({ where: { splitId: { in: splitIds } } });
  const splitDel = await prisma.expenseSplit.deleteMany({ where: { id: { in: splitIds } } });

  // Delete the 5 split expenses seeded by seedSplitDemo.js
  const splitTitles = [
    'Dinner at Hauz Khas Social',
    'Goa trip — hotel split',
    'Groceries for trip',
    'Lunch — Burma Burma',
    'Movie + snacks — IMAX',
  ];
  const expDel = await prisma.expense.deleteMany({
    where: { userId: ADITYA_ID, title: { in: splitTitles } },
  });

  // Also delete any "Split: ..." expenses created in demo accounts
  const splitExpDel = await prisma.expense.deleteMany({
    where: { title: { startsWith: 'Split:' } },
  });

  console.log(`✓ Payment requests deleted: ${prDel.count}`);
  console.log(`✓ ExpenseSplits deleted:    ${splitDel.count}`);
  console.log(`✓ Split expenses deleted:   ${expDel.count}`);
  console.log(`✓ Settled copies deleted:   ${splitExpDel.count}`);
  console.log('\nDB is clean. Ready to re-seed or test fresh.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
