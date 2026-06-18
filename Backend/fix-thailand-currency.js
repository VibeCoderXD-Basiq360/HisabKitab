// fix-thailand-currency.js
// Run AFTER restarting backend (so prisma generate has been run):
//   node fix-thailand-currency.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const group = await prisma.group.findFirst({
    where: { name: { contains: 'Thailand' } },
    select: { id: true, name: true },
  });

  if (!group) {
    console.log('❌ No Thailand group found');
    return;
  }
  console.log(`✅ Found group: ${group.name} (${group.id})`);

  const result = await prisma.groupExpense.updateMany({
    where: { groupId: group.id, currency: 'INR' },
    data: { currency: 'THB' },
  });
  console.log(`✅ Updated ${result.count} group expenses → currency: THB`);

  // Also fix the linked personal expenses for this group
  const personalResult = await prisma.expense.updateMany({
    where: { groupId: group.id, currency: 'INR' },
    data: { currency: 'THB' },
  });
  console.log(`✅ Updated ${personalResult.count} personal expenses → currency: THB`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
