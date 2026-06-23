/**
 * Seed script for new features:
 *   - Contact Requests (accept flow)
 *   - SharedTabs + TabEntries + TabSettlements
 *   - Auto-linked Expenses for all entries and settlements
 *
 * Run from Backend/: node scripts/seedNewFeatures.js
 * Safe to re-run — clears existing new-feature data for demo accounts first.
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');

const DEMO_EMAILS = [
  'hisabkitab.notify@gmail.com',
  'rahul@hisabkitab.demo',
  'priya@hisabkitab.demo',
  'arjun@hisabkitab.demo',
];

const d = (daysAgo) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(10, 0, 0, 0);
  return dt;
};

async function upsertPerson({ ownerId, name, email, linkedUserId }) {
  const existing = await prisma.person.findFirst({ where: { userId: ownerId, email } });
  if (existing) {
    return prisma.person.update({ where: { id: existing.id }, data: { linkedUserId, name } });
  }
  return prisma.person.create({ data: { userId: ownerId, name, email, linkedUserId } });
}

// Create a tab entry + linked expenses for both users
async function createEntry(tab, entryData, paymentByUserId, userById) {
  const { paidById, amount, description, splitType, splitRatio, category, date } = entryData;
  const otherUserId = tab.creatorId === paidById ? tab.memberId : tab.creatorId;

  const entry = await prisma.tabEntry.create({
    data: { tabId: tab.id, paidById, amount, description, splitType, splitRatio: splitRatio ?? 50, category: category || null, date },
  });

  const payerPayment = paymentByUserId[paidById];
  const otherPayment = paymentByUserId[otherUserId];
  const payer = userById[paidById];

  // Payer's expense = full amount they paid out of pocket
  if (payerPayment) {
    await prisma.expense.create({
      data: {
        userId: paidById,
        amount: Math.round(amount * 100) / 100,
        title: description,
        note: `From "${tab.name}" tab`,
        expenseDate: date,
        paymentTypeId: payerPayment.id,
        tabEntryId: entry.id,
      },
    });
  }

  // Other person's share
  const ratio = splitRatio ?? 50;
  const otherShare =
    splitType === 'MINE_ONLY'   ? 0 :
    splitType === 'THEIRS_ONLY' ? amount :
    Math.round(amount * (ratio / 100) * 100) / 100;

  if (otherShare > 0.01 && otherPayment) {
    await prisma.expense.create({
      data: {
        userId: otherUserId,
        amount: otherShare,
        title: description,
        note: `From "${tab.name}" tab (paid by ${payer?.name || 'other'})`,
        expenseDate: date,
        paymentTypeId: otherPayment.id,
        tabEntryId: entry.id,
      },
    });
  }

  return entry;
}

// Create a settlement + reimbursement expense for receiver
async function createSettlement(tab, { paidById, amount, note, date }, paymentByUserId, userById) {
  const settlementDate = date || new Date();

  const settlement = await prisma.tabSettlement.create({
    data: { tabId: tab.id, paidById, amount, note: note || null, date: settlementDate },
  });

  const receiverId = tab.creatorId === paidById ? tab.memberId : tab.creatorId;
  const receiverPayment = paymentByUserId[receiverId];
  const payer = userById[paidById];

  if (receiverPayment) {
    await prisma.expense.create({
      data: {
        userId: receiverId,
        amount: Math.round(amount * 100) / 100,
        title: `Settlement — ${tab.name}`,
        note: `Received from ${payer?.name || 'other'}`,
        expenseDate: settlementDate,
        paymentTypeId: receiverPayment.id,
        isReimbursement: true,
        tabSettlementId: settlement.id,
      },
    });
  }

  return settlement;
}

async function main() {
  // ── 1. Find demo users ────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, email: true, name: true },
  });

  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const main  = byEmail['hisabkitab.notify@gmail.com'];
  const rahul = byEmail['rahul@hisabkitab.demo'];
  const priya = byEmail['priya@hisabkitab.demo'];
  const arjun = byEmail['arjun@hisabkitab.demo'];

  if (!main || !rahul || !priya || !arjun) {
    const missing = DEMO_EMAILS.filter((e) => !byEmail[e]);
    console.error('Missing demo users:', missing);
    process.exit(1);
  }

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  console.log('Found demo users:', users.map((u) => u.email).join(', '));

  // ── 2. Fetch default payment types per user ───────────────────────────────
  const allPayments = await prisma.paymentType.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  // Pick first (default preferred) per user
  const paymentByUserId = {};
  for (const p of allPayments) {
    if (!paymentByUserId[p.userId]) paymentByUserId[p.userId] = p;
  }

  const missingPayments = users.filter((u) => !paymentByUserId[u.id]);
  if (missingPayments.length) {
    console.warn('No payment types for:', missingPayments.map((u) => u.email).join(', '));
    console.warn('Tab expenses will be skipped for those users.');
  }

  // ── 3. Clear existing new-feature data ───────────────────────────────────
  const demoIds = users.map((u) => u.id);

  // Delete entries/settlements first — their cascaded Expenses are auto-deleted
  await prisma.tabEntry.deleteMany({
    where: { tab: { OR: [{ creatorId: { in: demoIds } }, { memberId: { in: demoIds } }] } },
  });
  await prisma.tabSettlement.deleteMany({
    where: { tab: { OR: [{ creatorId: { in: demoIds } }, { memberId: { in: demoIds } }] } },
  });
  await prisma.sharedTab.deleteMany({
    where: { OR: [{ creatorId: { in: demoIds } }, { memberId: { in: demoIds } }] },
  });
  await prisma.contactRequest.deleteMany({
    where: { OR: [{ senderId: { in: demoIds } }, { recipientId: { in: demoIds } }] },
  });

  console.log('Cleared old new-feature data.');

  // ── 4. Contact Requests (ACCEPTED) between all pairs ─────────────────────
  const pairs = [
    [main, rahul], [main, priya], [main, arjun],
    [rahul, priya], [rahul, arjun], [priya, arjun],
  ];

  for (const [a, b] of pairs) {
    await prisma.contactRequest.create({
      data: { senderId: a.id, recipientId: b.id, recipientEmail: b.email, status: 'ACCEPTED' },
    });
    await upsertPerson({ ownerId: a.id, name: b.name || b.email.split('@')[0], email: b.email, linkedUserId: b.id });
    await upsertPerson({ ownerId: b.id, name: a.name || a.email.split('@')[0], email: a.email, linkedUserId: a.id });
  }

  console.log('Created contact requests and linked people.');

  // ── 5. SharedTabs ─────────────────────────────────────────────────────────

  // Tab 1: "Household" — Rahul ↔ Priya
  const householdTab = await prisma.sharedTab.create({
    data: { name: 'Household', status: 'ACTIVE', creatorId: rahul.id, memberId: priya.id },
  });

  for (const e of [
    { paidById: priya.id, amount: 3200, description: 'Big Basket groceries',  splitType: 'SPLIT',       splitRatio: 50, date: d(0)  },
    { paidById: rahul.id, amount: 1800, description: 'Electricity bill — June', splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(1)  },
    { paidById: priya.id, amount: 650,  description: 'Gas cylinder refill',    splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(2)  },
    { paidById: rahul.id, amount: 299,  description: 'Netflix (my account)',   splitType: 'MINE_ONLY',   splitRatio: 50, date: d(3)  },
    { paidById: rahul.id, amount: 2400, description: 'Water purifier repair',  splitType: 'SPLIT',       splitRatio: 60, date: d(5)  },
    { paidById: priya.id, amount: 1100, description: 'Swiggy Instamart — weekly', splitType: 'SPLIT',   splitRatio: 50, date: d(7)  },
    { paidById: rahul.id, amount: 420,  description: 'Gym membership (mine)',  splitType: 'MINE_ONLY',   splitRatio: 50, date: d(8)  },
    { paidById: priya.id, amount: 900,  description: 'Internet bill — BSNL',  splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(10) },
    { paidById: rahul.id, amount: 5600, description: 'Monthly ration — kirana', splitType: 'SPLIT',     splitRatio: 30, date: d(12) },
    { paidById: priya.id, amount: 180,  description: 'Yoga class (mine)',      splitType: 'MINE_ONLY',   splitRatio: 50, date: d(14) },
  ]) { await createEntry(householdTab, e, paymentByUserId, userById); }

  await createSettlement(householdTab, { paidById: priya.id, amount: 2000, note: 'GPay transfer — partial', date: d(4) }, paymentByUserId, userById);
  console.log('Created Household tab (Rahul ↔ Priya).');

  // Tab 2: "Flat 4B" — Main ↔ Rahul
  const flatTab = await prisma.sharedTab.create({
    data: { name: 'Flat 4B', status: 'ACTIVE', creatorId: main.id, memberId: rahul.id },
  });

  for (const e of [
    { paidById: main.id,  amount: 22000, description: 'Rent — June',         splitType: 'SPLIT',       splitRatio: 50, date: d(1)  },
    { paidById: rahul.id, amount: 2800,  description: 'Society maintenance',  splitType: 'SPLIT',       splitRatio: 50, date: d(3)  },
    { paidById: main.id,  amount: 1400,  description: 'Electricity',          splitType: 'SPLIT',       splitRatio: 50, date: d(6)  },
    { paidById: rahul.id, amount: 600,   description: 'Cooking gas',          splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(8)  },
    { paidById: main.id,  amount: 500,   description: 'Bai ka payment',       splitType: 'SPLIT',       splitRatio: 50, date: d(10) },
    { paidById: main.id,  amount: 3500,  description: 'Grocery — Reliance',   splitType: 'SPLIT',       splitRatio: 50, date: d(13) },
    { paidById: rahul.id, amount: 1200,  description: 'Plumber repair',       splitType: 'SPLIT',       splitRatio: 50, date: d(16) },
    { paidById: main.id,  amount: 800,   description: 'DTH recharge',         splitType: 'MINE_ONLY',   splitRatio: 50, date: d(18) },
  ]) { await createEntry(flatTab, e, paymentByUserId, userById); }

  await createSettlement(flatTab, { paidById: rahul.id, amount: 11000, note: 'Rent — my half', date: d(1) }, paymentByUserId, userById);
  console.log('Created Flat 4B tab (Main ↔ Rahul).');

  // Tab 3: "Office Snacks" — Arjun ↔ Main
  const officeTab = await prisma.sharedTab.create({
    data: { name: 'Office Snacks', status: 'ACTIVE', creatorId: arjun.id, memberId: main.id },
  });

  for (const e of [
    { paidById: arjun.id, amount: 450, description: 'Team chai + biscuits',  splitType: 'SPLIT',       splitRatio: 50, date: d(2)  },
    { paidById: main.id,  amount: 380, description: 'Friday pizza order',     splitType: 'SPLIT',       splitRatio: 50, date: d(5)  },
    { paidById: arjun.id, amount: 220, description: 'Sweets — Diwali',        splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(9)  },
    { paidById: main.id,  amount: 600, description: 'Coffee machine pods',    splitType: 'SPLIT',       splitRatio: 50, date: d(14) },
  ]) { await createEntry(officeTab, e, paymentByUserId, userById); }

  await createSettlement(officeTab, { paidById: main.id,  amount: 220, note: 'Settling Diwali sweets', date: d(7) }, paymentByUserId, userById);
  await createSettlement(officeTab, { paidById: arjun.id, amount: 415, note: 'GPay',                   date: d(3) }, paymentByUserId, userById);
  console.log('Created Office Snacks tab (Arjun ↔ Main).');

  // Tab 4: "Our Home" — Priya ↔ Arjun
  const priyaArjunTab = await prisma.sharedTab.create({
    data: { name: 'Our Home', status: 'ACTIVE', creatorId: priya.id, memberId: arjun.id },
  });

  for (const e of [
    { paidById: priya.id, amount: 18000, description: 'Rent — June',         splitType: 'SPLIT',       splitRatio: 50, date: d(2)  },
    { paidById: arjun.id, amount: 2200,  description: 'Electricity + water', splitType: 'SPLIT',       splitRatio: 50, date: d(4)  },
    { paidById: priya.id, amount: 4500,  description: 'Monthly groceries',   splitType: 'SPLIT',       splitRatio: 50, date: d(6)  },
    { paidById: arjun.id, amount: 1500,  description: 'WiFi bill',           splitType: 'THEIRS_ONLY', splitRatio: 50, date: d(8)  },
    { paidById: priya.id, amount: 700,   description: 'Bai salary',          splitType: 'SPLIT',       splitRatio: 50, date: d(10) },
    { paidById: arjun.id, amount: 350,   description: 'Parking — my car',    splitType: 'MINE_ONLY',   splitRatio: 50, date: d(11) },
    { paidById: priya.id, amount: 280,   description: 'Cooking gas',         splitType: 'SPLIT',       splitRatio: 50, date: d(15) },
  ]) { await createEntry(priyaArjunTab, e, paymentByUserId, userById); }

  await createSettlement(priyaArjunTab, { paidById: arjun.id, amount: 9000, note: 'Rent half', date: d(2) }, paymentByUserId, userById);
  console.log('Created Our Home tab (Priya ↔ Arjun).');

  // Tab 5: PENDING invite — Main → Priya
  await prisma.sharedTab.create({
    data: { name: 'Manali Trip Fund', status: 'PENDING', creatorId: main.id, memberId: priya.id },
  });
  console.log('Created pending invite: Main → Priya (Manali Trip Fund).');

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅ New-feature seed complete!');
  console.log('   ContactRequests (ACCEPTED): 6 pairs');
  console.log('   SharedTabs: 4 active + 1 pending invite');
  console.log('   TabEntries: ~33 + linked Expenses for each user');
  console.log('   TabSettlements: 5 + reimbursement Expenses for receivers');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
