const prisma = require('../src/lib/prisma');

async function main() {
  // ── Find users ──────────────────────────────────────────────────────────────
  const [aditya, riya, karan] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'adityaarora0601@gmail.com' } }),
    prisma.user.findUnique({ where: { email: 'demo1@hisabkitab.app' } }),
    prisma.user.findUnique({ where: { email: 'demo2@hisabkitab.app' } }),
  ]);

  if (!aditya) throw new Error('Aditya not found — make sure adityaarora0601@gmail.com is signed up');
  if (!riya)   throw new Error('Riya not found — make sure demo1@hisabkitab.app is signed up');
  if (!karan)  throw new Error('Karan not found — make sure demo2@hisabkitab.app is signed up');

  console.log('✓ Found users:', aditya.name, '/', riya.name, '/', karan.name);

  // ── Delete existing demo group if any ───────────────────────────────────────
  const existing = await prisma.group.findFirst({ where: { name: 'Thailand Trip 2026' } });
  if (existing) {
    await prisma.group.delete({ where: { id: existing.id } });
    console.log('✓ Deleted existing demo group');
  }

  // ── Create group ─────────────────────────────────────────────────────────────
  const group = await prisma.group.create({
    data: {
      name: 'Thailand Trip 2026',
      icon: '🌴',
      type: 'TRIP',
      createdByUserId: aditya.id,
      members: {
        create: [
          { userId: aditya.id, name: aditya.name || 'Aditya', email: aditya.email, role: 'ADMIN' },
          { userId: riya.id,   name: riya.name   || 'Riya',   email: riya.email,   role: 'MEMBER' },
          { userId: karan.id,  name: karan.name  || 'Karan',  email: karan.email,  role: 'MEMBER' },
        ],
      },
    },
    include: { members: true },
  });

  const mAditya = group.members.find(m => m.userId === aditya.id);
  const mRiya   = group.members.find(m => m.userId === riya.id);
  const mKaran  = group.members.find(m => m.userId === karan.id);

  console.log('✓ Group created:', group.name, '(id:', group.id + ')');

  // ── Helper: get default paymentType for a user ───────────────────────────────
  async function defaultPaymentType(userId) {
    return prisma.paymentType.findFirst({ where: { userId } });
  }

  // ── Expense 1: Aditya paid hotel — ₹9,000 split equally ────────────────────
  const exp1Amount = 9000;
  const exp1Share  = Math.round((exp1Amount / 3) * 100) / 100;
  const exp1 = await prisma.groupExpense.create({
    data: {
      groupId: group.id,
      addedByMemberId: mAditya.id,
      paidByMemberId:  mAditya.id,
      amount: exp1Amount,
      title: 'Hotel — 2 nights',
      note: 'Beach resort, Calangute',
      expenseDate: new Date('2026-06-10'),
      splitType: 'EQUAL',
      shares: {
        create: [
          { memberId: mAditya.id, amount: exp1Share },
          { memberId: mRiya.id,   amount: exp1Share },
          { memberId: mKaran.id,  amount: exp1Share },
        ],
      },
    },
  });

  const adityaPT = await defaultPaymentType(aditya.id);
  if (adityaPT) {
    await prisma.expense.create({
      data: {
        userId: aditya.id,
        amount: exp1Amount,
        title: 'Hotel — 2 nights',
        note: 'Group: Thailand Trip 2026',
        expenseDate: new Date('2026-06-10'),
        paymentTypeId: adityaPT.id,
        groupId: group.id,
      },
    });
  }
  console.log('✓ Expense 1: Hotel ₹9,000 (Aditya paid)');

  // ── Expense 2: Riya paid dinner — ₹2,400 split equally ──────────────────────
  const exp2Amount = 2400;
  const exp2Share  = Math.round((exp2Amount / 3) * 100) / 100;
  await prisma.groupExpense.create({
    data: {
      groupId: group.id,
      addedByMemberId: mRiya.id,
      paidByMemberId:  mRiya.id,
      amount: exp2Amount,
      title: 'Dinner at Thalassa',
      note: 'Seafood + cocktails',
      expenseDate: new Date('2026-06-11'),
      splitType: 'EQUAL',
      shares: {
        create: [
          { memberId: mAditya.id, amount: exp2Share },
          { memberId: mRiya.id,   amount: exp2Share },
          { memberId: mKaran.id,  amount: exp2Share },
        ],
      },
    },
  });

  const riyaPT = await defaultPaymentType(riya.id);
  if (riyaPT) {
    await prisma.expense.create({
      data: {
        userId: riya.id,
        amount: exp2Amount,
        title: 'Dinner at Thalassa',
        note: 'Group: Thailand Trip 2026',
        expenseDate: new Date('2026-06-11'),
        paymentTypeId: riyaPT.id,
        groupId: group.id,
      },
    });
  }
  console.log('✓ Expense 2: Dinner ₹2,400 (Riya paid)');

  // ── Expense 3: Karan paid activities — ₹3,600 split equally ─────────────────
  const exp3Amount = 3600;
  const exp3Share  = Math.round((exp3Amount / 3) * 100) / 100;
  await prisma.groupExpense.create({
    data: {
      groupId: group.id,
      addedByMemberId: mKaran.id,
      paidByMemberId:  mKaran.id,
      amount: exp3Amount,
      title: 'Water sports',
      note: 'Parasailing + banana boat',
      expenseDate: new Date('2026-06-12'),
      splitType: 'EQUAL',
      shares: {
        create: [
          { memberId: mAditya.id, amount: exp3Share },
          { memberId: mRiya.id,   amount: exp3Share },
          { memberId: mKaran.id,  amount: exp3Share },
        ],
      },
    },
  });

  const karanPT = await defaultPaymentType(karan.id);
  if (karanPT) {
    await prisma.expense.create({
      data: {
        userId: karan.id,
        amount: exp3Amount,
        title: 'Water sports',
        note: 'Group: Thailand Trip 2026',
        expenseDate: new Date('2026-06-12'),
        paymentTypeId: karanPT.id,
        groupId: group.id,
      },
    });
  }
  console.log('✓ Expense 3: Water sports ₹3,600 (Karan paid)');

  // ── Expense 4: Aditya paid transport — custom split ─────────────────────────
  await prisma.groupExpense.create({
    data: {
      groupId: group.id,
      addedByMemberId: mAditya.id,
      paidByMemberId:  mAditya.id,
      amount: 1800,
      title: 'Cab to airport',
      expenseDate: new Date('2026-06-13'),
      splitType: 'EXACT',
      shares: {
        create: [
          { memberId: mAditya.id, amount: 600 },
          { memberId: mRiya.id,   amount: 700 },
          { memberId: mKaran.id,  amount: 500 },
        ],
      },
    },
  });

  if (adityaPT) {
    await prisma.expense.create({
      data: {
        userId: aditya.id,
        amount: 1800,
        title: 'Cab to airport',
        note: 'Group: Thailand Trip 2026',
        expenseDate: new Date('2026-06-13'),
        paymentTypeId: adityaPT.id,
        groupId: group.id,
      },
    });
  }
  console.log('✓ Expense 4: Cab ₹1,800 (Aditya paid, custom split)');

  // ── Print expected balances ──────────────────────────────────────────────────
  // Aditya paid: 9000 + 1800 = 10800, owes: 3000+800+1200+600 = 5600 → net +5200
  // Riya paid: 2400, owes: 3000+800+700 = 4500 → net -2100  (actually let me compute properly)
  // Each share: hotel 3000 each, dinner 800 each, watersports 1200 each, cab 600/700/500
  // Aditya: paid 10800, owes (3000+800+1200+600) = 5600 → net +5200
  // Riya:   paid 2400,  owes (3000+800+1200+700) = 5700 → net -3300
  // Karan:  paid 3600,  owes (3000+800+1200+500) = 5500 → net -1900

  console.log('\n── Expected balances ──────────────────────');
  console.log('Aditya: +₹5,200 (owed by others)');
  console.log('Riya:   -₹3,300 (owes)');
  console.log('Karan:  -₹1,900 (owes)');
  console.log('\n── Settle up plan ─────────────────────────');
  console.log('Riya  → Aditya: ₹3,300');
  console.log('Karan → Aditya: ₹1,900');
  console.log('\n✅ Demo group seeded successfully!');
  console.log('Group ID:', group.id);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
