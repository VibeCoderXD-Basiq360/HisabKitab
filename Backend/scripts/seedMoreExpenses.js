require('dotenv').config();
const prisma = require('../src/lib/prisma');

const USER_ID = 'cmpzt4ki6000030h7fsnw5xpj';

async function main() {
  const cats = await prisma.category.findMany({ where: { userId: USER_ID } });
  const types = await prisma.paymentType.findMany({ where: { userId: USER_ID } });

  const cat = (name) => cats.find((c) => c.name === name)?.id;
  const type = (name) => types.find((t) => t.name === name)?.id;

  const [rahul, priya, amit] = await Promise.all([
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Rahul' } }, update: {}, create: { userId: USER_ID, name: 'Rahul' } }),
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Priya' } }, update: {}, create: { userId: USER_ID, name: 'Priya' } }),
    prisma.person.upsert({ where: { userId_name: { userId: USER_ID, name: 'Amit' } },  update: {}, create: { userId: USER_ID, name: 'Amit' } }),
  ]);

  const now = new Date();
  const d = (daysAgo) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

  const expenses = [
    { amount: 12500, title: 'Rent — June',               categoryId: cat('Bills'),         paymentTypeId: type('Debit Card'),  expenseDate: d(1),  note: 'Monthly rent' },
    { amount: 850,   title: 'Zomato — biryani night',    categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(1),  people: [priya.id] },
    { amount: 1800,  title: 'Gym membership',            categoryId: cat('Medical'),       paymentTypeId: type('UPI'),         expenseDate: d(2),  note: 'June monthly' },
    { amount: 299,   title: 'Spotify Premium',           categoryId: cat('Entertainment'), paymentTypeId: type('Credit Card'), expenseDate: d(2) },
    { amount: 3400,  title: 'Amazon — headphones',       categoryId: cat('Shopping'),      paymentTypeId: type('Credit Card'), expenseDate: d(3),  note: 'Noise Cancelling' },
    { amount: 65,    title: 'Rapido bike',               categoryId: cat('Transport'),     paymentTypeId: type('UPI'),         expenseDate: d(3) },
    { amount: 1100,  title: 'Grocery — DMart',           categoryId: cat('Grocery'),       paymentTypeId: type('Debit Card'),  expenseDate: d(4) },
    { amount: 180,   title: 'Breakfast — Café Coffee Day', categoryId: cat('Food'),        paymentTypeId: type('UPI'),         expenseDate: d(4) },
    { amount: 450,   title: 'Water bill',                categoryId: cat('Bills'),         paymentTypeId: type('UPI'),         expenseDate: d(5) },
    { amount: 2200,  title: 'LIC premium',               categoryId: cat('Bills'),         paymentTypeId: type('Debit Card'),  expenseDate: d(6),  note: 'Quarterly payment' },
    { amount: 390,   title: 'Dinner — Barbeque Nation',  categoryId: cat('Food'),          paymentTypeId: type('Credit Card'), expenseDate: d(6),  people: [rahul.id, amit.id] },
    { amount: 80,    title: 'Auto — office commute',     categoryId: cat('Transport'),     paymentTypeId: type('Cash'),        expenseDate: d(7) },
    { amount: 599,   title: 'Amazon Prime renewal',      categoryId: cat('Entertainment'), paymentTypeId: type('Credit Card'), expenseDate: d(8) },
    { amount: 240,   title: 'Pharmacy — vitamins',       categoryId: cat('Medical'),       paymentTypeId: type('Cash'),        expenseDate: d(9) },
    { amount: 1650,  title: 'New book — Clean Code',     categoryId: cat('Education'),     paymentTypeId: type('UPI'),         expenseDate: d(10) },
    { amount: 350,   title: 'Haircut — salon',           categoryId: cat('Shopping'),      paymentTypeId: type('Cash'),        expenseDate: d(11) },
    { amount: 4200,  title: 'Myntra — summer clothes',   categoryId: cat('Shopping'),      paymentTypeId: type('Credit Card'), expenseDate: d(12), note: 'Season sale' },
    { amount: 900,   title: 'Petrol',                    categoryId: cat('Fuel'),          paymentTypeId: type('UPI'),         expenseDate: d(13) },
    { amount: 1200,  title: 'Weekend brunch — Social',   categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(14), people: [priya.id, rahul.id] },
    { amount: 5500,  title: 'Train tickets — Goa trip',  categoryId: cat('Travel'),        paymentTypeId: type('Credit Card'), expenseDate: d(16), note: 'Advance booking', people: [priya.id] },
  ];

  for (const e of expenses) {
    const { people, ...data } = e;
    await prisma.expense.create({
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

  console.log('\n20 more expenses seeded!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
