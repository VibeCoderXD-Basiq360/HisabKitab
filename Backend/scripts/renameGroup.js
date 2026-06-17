const prisma = require('../src/lib/prisma');
async function run() {
  const g = await prisma.group.findFirst({ where: { name: 'Goa Trip 2026' } });
  if (!g) { console.log('Group not found'); return; }
  await prisma.group.update({ where: { id: g.id }, data: { name: 'Thailand Trip 2026', icon: '🌴' } });
  await prisma.expense.updateMany({ where: { groupId: g.id }, data: { note: 'Group: Thailand Trip 2026' } });
  console.log('Done — group id:', g.id);
}
run().catch(console.error).finally(() => prisma.$disconnect());
