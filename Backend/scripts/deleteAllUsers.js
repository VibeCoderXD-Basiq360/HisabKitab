const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.business.deleteMany({});
  await prisma.contactRequest.deleteMany({});
  await prisma.cardRepayment.deleteMany({});
  await prisma.cardDelegation.deleteMany({});
  await prisma.bulkPayment.deleteMany({});
  await prisma.tabSettlement.deleteMany({});
  await prisma.tabEntry.deleteMany({});
  await prisma.tabMember.deleteMany({});
  await prisma.sharedTab.deleteMany({});
  await prisma.tabGroup.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.person.updateMany({ where: { linkedUserId: { not: null } }, data: { linkedUserId: null } });
  const del = await prisma.user.deleteMany({});
  console.log(`Deleted ${del.count} users. DB is empty.`);
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
