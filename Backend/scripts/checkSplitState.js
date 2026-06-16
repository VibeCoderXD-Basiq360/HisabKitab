require('dotenv').config();
const prisma = require('../src/lib/prisma');

const ADITYA_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  const expenses = await prisma.expense.findMany({
    where: { userId: ADITYA_ID, title: { in: ['Goa trip — hotel split', 'Dinner at Hauz Khas Social', 'Groceries for trip', 'Lunch — Burma Burma', 'Movie + snacks — IMAX'] } },
    include: { splits: true },
  });

  for (const e of expenses) {
    console.log(`\n${e.title}`);
    console.log(`  amount: ₹${e.amount}`);
    console.log(`  splits: ${e.splits.length}`);
    for (const s of e.splits) {
      console.log(`    ₹${s.amount} → ${s.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
