require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Wiping entire database...\n');

  // CASCADE from these root tables clears everything
  await prisma.$executeRaw`TRUNCATE "Business" CASCADE`;
  console.log('✓ Business + all children');

  await prisma.$executeRaw`TRUNCATE "Group" CASCADE`;
  console.log('✓ Groups + all children');

  await prisma.$executeRaw`TRUNCATE "TabGroup" CASCADE`;
  console.log('✓ TabGroups + all children');

  await prisma.$executeRaw`TRUNCATE "SharedTab" CASCADE`;
  console.log('✓ SharedTabs + all children');

  await prisma.$executeRaw`TRUNCATE "ContactRequest" CASCADE`;
  console.log('✓ ContactRequests');

  await prisma.$executeRaw`TRUNCATE "User" CASCADE`;
  console.log('✓ Users + all children');

  console.log('\n✅ Database is clean. All tables empty.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
