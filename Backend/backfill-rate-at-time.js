// backfill-rate-at-time.js
// Sets rateAtTime on all existing non-INR expenses using each user's stored exchange rate.
// Run once after the prisma db push:
//   node backfill-rate-at-time.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ── GroupExpenses ────────────────────────────────────────────────────────────
  const gExpenses = await prisma.groupExpense.findMany({
    where: { currency: { not: 'INR' }, rateAtTime: null },
    select: { id: true, currency: true, groupId: true, group: { select: { createdByUserId: true } } },
  });
  console.log(`GroupExpenses to backfill: ${gExpenses.length}`);

  let gUpdated = 0;
  for (const ge of gExpenses) {
    const userId = ge.group.createdByUserId;
    const er = await prisma.exchangeRate.findFirst({
      where: { userId, fromCurrency: ge.currency, toCurrency: 'INR' },
      select: { rate: true },
    });
    if (!er) continue;
    await prisma.groupExpense.update({ where: { id: ge.id }, data: { rateAtTime: Number(er.rate) } });
    gUpdated++;
  }
  console.log(`✅ Updated ${gUpdated}/${gExpenses.length} group expenses`);

  // ── Personal Expenses ────────────────────────────────────────────────────────
  const pExpenses = await prisma.expense.findMany({
    where: { currency: { not: 'INR' }, rateAtTime: null },
    select: { id: true, currency: true, userId: true },
  });
  console.log(`Personal expenses to backfill: ${pExpenses.length}`);

  let pUpdated = 0;
  for (const pe of pExpenses) {
    const er = await prisma.exchangeRate.findFirst({
      where: { userId: pe.userId, fromCurrency: pe.currency, toCurrency: 'INR' },
      select: { rate: true },
    });
    if (!er) continue;
    await prisma.expense.update({ where: { id: pe.id }, data: { rateAtTime: Number(er.rate) } });
    pUpdated++;
  }
  console.log(`✅ Updated ${pUpdated}/${pExpenses.length} personal expenses`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
