require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  // Get all users who have accounts
  const accounts = await prisma.account.findMany({
    where: { type: { in: ['SAVINGS', 'CURRENT'] } },
    orderBy: { createdAt: 'asc' },
  });

  // Group by userId — pick first SAVINGS, fallback to CURRENT
  const defaultByUser = {};
  for (const acc of accounts) {
    if (!defaultByUser[acc.userId]) {
      defaultByUser[acc.userId] = acc;
    } else if (acc.type === 'SAVINGS' && defaultByUser[acc.userId].type !== 'SAVINGS') {
      defaultByUser[acc.userId] = acc;
    }
  }

  let total = 0;
  for (const [userId, acc] of Object.entries(defaultByUser)) {
    const result = await prisma.expense.updateMany({
      where: { userId, accountId: null },
      data: { accountId: acc.id },
    });
    if (result.count > 0) {
      console.log(`  ${acc.name} (${acc.type}) ← ${result.count} expenses linked`);
      total += result.count;
    }
  }

  console.log(`\n✅ ${total} expenses linked to accounts`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
