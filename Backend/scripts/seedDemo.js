require('dotenv').config();
const prisma = require('../src/lib/prisma');

const USER_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  // Fetch seeded categories and payment types
  const cats = await prisma.category.findMany({ where: { userId: USER_ID } });
  const types = await prisma.paymentType.findMany({ where: { userId: USER_ID } });

  const cat = (name) => cats.find((c) => c.name === name)?.id;
  const type = (name) => types.find((t) => t.name === name)?.id;

  // People
  const [rahul, priya, amit] = await Promise.all([
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Rahul' } }, update: {}, create: { userId: USER_ID, name: 'Rahul' } }),
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Priya' } }, update: {}, create: { userId: USER_ID, name: 'Priya' } }),
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Amit' } },  update: {}, create: { userId: USER_ID, name: 'Amit' } }),
  ]);

  const now = new Date();
  const d = (daysAgo) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

  const expenses = [
    { amount: 320,  title: 'Dinner at Punjab Grill',    categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(0),  note: 'Butter chicken was great', people: [rahul.id, priya.id] },
    { amount: 55,   title: 'Metro card recharge',        categoryId: cat('Transport'),     paymentTypeId: type('UPI'),         expenseDate: d(0) },
    { amount: 2800, title: 'Grocery — Big Basket',       categoryId: cat('Grocery'),       paymentTypeId: type('Credit Card'), expenseDate: d(1),  note: 'Monthly grocery run' },
    { amount: 500,  title: 'Petrol',                     categoryId: cat('Fuel'),          paymentTypeId: type('Cash'),        expenseDate: d(1) },
    { amount: 199,  title: 'Netflix subscription',       categoryId: cat('Bills'),         paymentTypeId: type('Credit Card'), expenseDate: d(2) },
    { amount: 450,  title: 'Lunch — Chaayos',            categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(2),  people: [amit.id] },
    { amount: 1200, title: 'Doctor consultation',        categoryId: cat('Medical'),       paymentTypeId: type('Cash'),        expenseDate: d(3),  note: 'Follow-up visit' },
    { amount: 800,  title: 'Udemy course',               categoryId: cat('Education'),     paymentTypeId: type('Credit Card'), expenseDate: d(4) },
    { amount: 650,  title: 'Movie — IMAX',               categoryId: cat('Entertainment'), paymentTypeId: type('UPI'),         expenseDate: d(5),  people: [priya.id, rahul.id] },
    { amount: 120,  title: 'Ola cab',                    categoryId: cat('Transport'),     paymentTypeId: type('UPI'),         expenseDate: d(5) },
    { amount: 3200, title: 'Shoes — Nike',               categoryId: cat('Shopping'),      paymentTypeId: type('Debit Card'),  expenseDate: d(6) },
    { amount: 420,  title: 'Electricity bill',           categoryId: cat('Bills'),         paymentTypeId: type('UPI'),         expenseDate: d(7),  note: 'June bill' },
    { amount: 280,  title: 'Breakfast — Starbucks',      categoryId: cat('Food'),          paymentTypeId: type('Credit Card'), expenseDate: d(8) },
    { amount: 2500, title: 'Weekend trip — Lonavala',    categoryId: cat('Travel'),        paymentTypeId: type('Cash'),        expenseDate: d(9),  people: [rahul.id, priya.id, amit.id] },
    { amount: 600,  title: 'Petrol — highway',           categoryId: cat('Fuel'),          paymentTypeId: type('Cash'),        expenseDate: d(9) },
    { amount: 180,  title: 'Pharmacy',                   categoryId: cat('Medical'),       paymentTypeId: type('Cash'),        expenseDate: d(10) },
    { amount: 950,  title: 'Swiggy — office lunch',      categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(11), people: [amit.id] },
    { amount: 1499, title: 'Jio recharge',               categoryId: cat('Bills'),         paymentTypeId: type('UPI'),         expenseDate: d(12) },
    { amount: 750,  title: 'Zara — T-shirts',            categoryId: cat('Shopping'),      paymentTypeId: type('Debit Card'),  expenseDate: d(13) },
    { amount: 4500, title: 'Flight — Mumbai to Delhi',   categoryId: cat('Travel'),        paymentTypeId: type('Credit Card'), expenseDate: d(15), note: 'Work trip' },
  ];

  for (const e of expenses) {
    const { people, ...data } = e;
    const expense = await prisma.expense.create({
      data: {
        userId: USER_ID,
        currency: 'INR',
        ...data,
        ...(people?.length && {
          people: { create: people.map((personId) => ({ personId })) },
        }),
      },
    });
    console.log(`✓ ₹${e.amount} — ${e.title}`);
  }

  console.log('\nDemo data seeded successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
