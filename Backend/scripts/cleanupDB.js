const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vishu = await prisma.user.findFirst({
    where: { email: 'vishuyadav2203@gmail.com' },
    select: { id: true, name: true, email: true }
  });

  if (!vishu) throw new Error('Vishu not found in DB!');
  console.log(`\nKeeping : ${vishu.name} (${vishu.email})`);

  const otherUsers = await prisma.user.findMany({
    where: { id: { not: vishu.id } },
    select: { id: true, name: true }
  });
  const otherIds = otherUsers.map(u => u.id);
  console.log(`Deleting: ${otherUsers.map(u => u.name).join(', ')}\n`);

  // 1. All Businesses — cascades to BusinessPartner, Location, Settings, InventoryItem,
  //    InventoryStock, InventoryTransaction, InventoryTransfer, Customer, Job, JobItem,
  //    BusinessExpense, PartnerWithdrawal
  const biz = await prisma.business.deleteMany({});
  console.log(`✓ ${biz.count} businesses deleted (+ all business data)`);

  // 2. Cross-user entities that don't cascade from User
  await prisma.contactRequest.deleteMany({});
  console.log('✓ Contact requests deleted');

  await prisma.cardRepayment.deleteMany({});
  await prisma.cardDelegation.deleteMany({});
  console.log('✓ Card delegations & repayments deleted');

  const bulk = await prisma.bulkPayment.deleteMany({});
  console.log(`✓ ${bulk.count} bulk payments deleted`);

  // 3. Shared Tabs — unlink Vishu's tab-linked expenses first so they aren't cascade-deleted
  await prisma.expense.updateMany({
    where: { userId: vishu.id, tabEntryId: { not: null } },
    data: { tabEntryId: null }
  });
  await prisma.expense.updateMany({
    where: { userId: vishu.id, tabSettlementId: { not: null } },
    data: { tabSettlementId: null }
  });
  await prisma.tabSettlement.deleteMany({});
  await prisma.tabEntry.deleteMany({});
  await prisma.tabMember.deleteMany({});
  await prisma.sharedTab.deleteMany({});
  await prisma.tabGroup.deleteMany({});
  console.log('✓ Shared tabs & tab groups deleted (Vishu\'s tab-linked expenses preserved)');

  // 4. Groups — GroupMember, GroupExpense, GroupExpenseShare, GroupSettlement all cascade
  const grps = await prisma.group.deleteMany({});
  console.log(`✓ ${grps.count} groups deleted`);

  // 5. Null out Person.linkedUserId pointing to other users (no onDelete on this FK)
  const linked = await prisma.person.updateMany({
    where: { linkedUserId: { in: otherIds } },
    data: { linkedUserId: null }
  });
  console.log(`✓ ${linked.count} person→user links nulled`);

  // 6. Delete the other users — Prisma/PG cascade handles:
  //    Expense + ExpenseItem, ExpensePerson, ExpenseSplit, PaymentRequest, ExpenseComment
  //    Category, PaymentType, RecurringExpense, Budget, SavingsGoal, FinancialGoal
  //    Account, AccountTransfer, CreditCardPayment, Income, Subscription
  //    Notification, Loan, LoanPayment, ExchangeRate, WebAuthnCredential
  //    ExpenseTemplate, Asset, Person, AccountTransfer
  const del = await prisma.user.deleteMany({ where: { id: { in: otherIds } } });
  console.log(`✓ ${del.count} users deleted (+ all their personal data)`);

  const remaining = await prisma.user.findMany({
    select: { name: true, email: true }
  });
  console.log('\nRemaining users:');
  remaining.forEach(u => console.log(`  · ${u.name} — ${u.email}`));
}

main()
  .catch(e => { console.error('\nERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
