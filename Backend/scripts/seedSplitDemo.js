require('dotenv').config();
const prisma = require('../src/lib/prisma');

const ADITYA_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  // 1. Get Riya and Karan's user records
  const riyaUser  = await prisma.user.findUnique({ where: { email: 'demo1@hisabkitab.app' } });
  const karanUser = await prisma.user.findUnique({ where: { email: 'demo2@hisabkitab.app' } });

  if (!riyaUser || !karanUser) {
    console.error('Demo users not found. Run seedDemoUsers.js first.');
    process.exit(1);
  }

  // 2. Add Riya and Karan as People in Aditya's contact list, linked to their accounts
  const riya = await prisma.person.upsert({
    where: { userId_name: { userId: ADITYA_ID, name: 'Riya' } },
    update: { email: riyaUser.email, linkedUserId: riyaUser.id },
    create: { userId: ADITYA_ID, name: 'Riya', email: riyaUser.email, linkedUserId: riyaUser.id },
  });

  const karan = await prisma.person.upsert({
    where: { userId_name: { userId: ADITYA_ID, name: 'Karan' } },
    update: { email: karanUser.email, linkedUserId: karanUser.id },
    create: { userId: ADITYA_ID, name: 'Karan', email: karanUser.email, linkedUserId: karanUser.id },
  });

  console.log(`✓ Riya  linked → ${riyaUser.email} (userId: ${riyaUser.id})`);
  console.log(`✓ Karan linked → ${karanUser.email} (userId: ${karanUser.id})`);

  // 3. Fetch Aditya's categories and payment types
  const cats  = await prisma.category.findMany({ where: { userId: ADITYA_ID } });
  const types = await prisma.paymentType.findMany({ where: { userId: ADITYA_ID } });
  const cat  = (name) => cats.find((c) => c.name === name)?.id;
  const type = (name) => types.find((t) => t.name === name)?.id;

  const now = new Date();
  const d   = (daysAgo) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

  // 4. Create 5 split expenses (Aditya pays, Riya + Karan owe)
  const splitExpenses = [
    {
      amount: 1800, title: 'Dinner at Hauz Khas Social',
      categoryId: cat('Food'), paymentTypeId: type('UPI'),
      expenseDate: d(0), note: 'Team dinner',
      peopleIds: [riya.id, karan.id],          // 3 people → ₹600 each
    },
    {
      amount: 2400, title: 'Goa trip — hotel split',
      categoryId: cat('Travel'), paymentTypeId: type('Credit Card'),
      expenseDate: d(2), note: 'First night stay',
      peopleIds: [riya.id, karan.id],          // ₹800 each
    },
    {
      amount: 900, title: 'Groceries for trip',
      categoryId: cat('Grocery'), paymentTypeId: type('Cash'),
      expenseDate: d(3),
      peopleIds: [riya.id, karan.id],          // ₹300 each
    },
    {
      amount: 1200, title: 'Lunch — Burma Burma',
      categoryId: cat('Food'), paymentTypeId: type('UPI'),
      expenseDate: d(5),
      peopleIds: [riya.id],                    // 2 people → ₹600 each (Riya only)
    },
    {
      amount: 1500, title: 'Movie + snacks — IMAX',
      categoryId: cat('Entertainment'), paymentTypeId: type('Credit Card'),
      expenseDate: d(7),
      peopleIds: [karan.id],                   // 2 people → ₹750 each (Karan only)
    },
  ];

  for (const e of splitExpenses) {
    const { peopleIds, ...data } = e;
    const share = +(data.amount / (peopleIds.length + 1)).toFixed(2);

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        userId: ADITYA_ID,
        currency: 'INR',
        ...data,
        people: { create: peopleIds.map((personId) => ({ personId })) },
      },
    });

    // Create splits
    for (const personId of peopleIds) {
      await prisma.expenseSplit.create({
        data: { expenseId: expense.id, personId, amount: share },
      });
    }

    const names = peopleIds.map((id) => (id === riya.id ? 'Riya' : 'Karan')).join(' + ');
    console.log(`✓ ₹${data.amount} — ${data.title}  →  ₹${share} each  (${names})`);
  }

  console.log('\n--- Summary ---');
  const splits = await prisma.expenseSplit.findMany({
    where: { expense: { userId: ADITYA_ID } },
    include: { person: true },
  });

  const totals = {};
  for (const s of splits) {
    totals[s.person.name] = (totals[s.person.name] || 0) + Number(s.amount);
  }
  for (const [name, total] of Object.entries(totals)) {
    console.log(`  ${name} owes Aditya  ₹${total.toFixed(2)}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
