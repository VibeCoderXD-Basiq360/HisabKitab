require('dotenv').config();
const admin = require('../src/config/firebase');
const prisma = require('../src/lib/prisma');

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#FF5722' },
  { name: 'Transport', icon: '🚌', color: '#2196F3' },
  { name: 'Fuel', icon: '⛽', color: '#FF9800' },
  { name: 'Grocery', icon: '🛒', color: '#4CAF50' },
  { name: 'Medical', icon: '💊', color: '#F44336' },
  { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
  { name: 'Bills', icon: '📄', color: '#607D8B' },
  { name: 'Education', icon: '📚', color: '#3F51B5' },
  { name: 'Shopping', icon: '🛍️', color: '#E91E63' },
  { name: 'Travel', icon: '✈️', color: '#00BCD4' },
];

const DEFAULT_PAYMENT_TYPES = [
  { name: 'Cash', icon: '💵', color: '#4CAF50', isDefault: true },
  { name: 'UPI', icon: '📱', color: '#2196F3', isDefault: false },
  { name: 'Credit Card', icon: '💳', color: '#9C27B0', isDefault: false },
  { name: 'Debit Card', icon: '🏦', color: '#FF5722', isDefault: false },
];

const DEMO_USERS = [
  { email: 'demo1@hisabkitab.app', password: 'Demo@1234', name: 'Riya Sharma' },
  { email: 'demo2@hisabkitab.app', password: 'Demo@1234', name: 'Karan Mehta' },
];

async function seedExpenses(userId, cats, types) {
  const cat = (name) => cats.find((c) => c.name === name)?.id;
  const type = (name) => types.find((t) => t.name === name)?.id;

  const now = new Date();
  const d = (daysAgo) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

  const expenses = [
    { amount: 280,  title: 'Lunch — Barbeque Nation', categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(0) },
    { amount: 80,   title: 'Auto rickshaw',             categoryId: cat('Transport'),     paymentTypeId: type('Cash'),        expenseDate: d(1) },
    { amount: 1850, title: 'Grocery — DMart',           categoryId: cat('Grocery'),       paymentTypeId: type('Debit Card'),  expenseDate: d(2) },
    { amount: 450,  title: 'Petrol',                    categoryId: cat('Fuel'),          paymentTypeId: type('Cash'),        expenseDate: d(3) },
    { amount: 149,  title: 'Spotify subscription',      categoryId: cat('Bills'),         paymentTypeId: type('Credit Card'), expenseDate: d(4) },
    { amount: 600,  title: 'Movie night',               categoryId: cat('Entertainment'), paymentTypeId: type('UPI'),         expenseDate: d(5) },
    { amount: 350,  title: 'Pharmacy',                  categoryId: cat('Medical'),       paymentTypeId: type('Cash'),        expenseDate: d(6) },
    { amount: 2200, title: 'Coursera subscription',     categoryId: cat('Education'),     paymentTypeId: type('Credit Card'), expenseDate: d(8) },
    { amount: 1500, title: 'Clothes — H&M',             categoryId: cat('Shopping'),      paymentTypeId: type('Debit Card'),  expenseDate: d(10) },
    { amount: 3800, title: 'Goa trip — hotel',          categoryId: cat('Travel'),        paymentTypeId: type('Credit Card'), expenseDate: d(12) },
    { amount: 520,  title: 'Electricity bill',          categoryId: cat('Bills'),         paymentTypeId: type('UPI'),         expenseDate: d(14) },
    { amount: 190,  title: 'Breakfast — Cafe Coffee Day', categoryId: cat('Food'),       paymentTypeId: type('UPI'),         expenseDate: d(15) },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: { userId, currency: 'INR', ...e },
    });
  }
}

async function main() {
  for (const demo of DEMO_USERS) {
    console.log(`\nCreating user: ${demo.email}`);

    // Create or reuse Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(demo.email);
      console.log('  Firebase user already exists, reusing');
    } catch {
      firebaseUser = await admin.auth().createUser({
        email: demo.email,
        password: demo.password,
        displayName: demo.name,
        emailVerified: true,
      });
      console.log('  Firebase user created');
    }

    // Create or reuse DB user
    let dbUser = await prisma.user.findUnique({ where: { firebaseUid: firebaseUser.uid } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { firebaseUid: firebaseUser.uid, email: demo.email, name: demo.name },
      });
      console.log('  DB user created');

      // Seed categories + payment types
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: dbUser.id })),
        skipDuplicates: true,
      });
      await prisma.paymentType.createMany({
        data: DEFAULT_PAYMENT_TYPES.map((p) => ({ ...p, userId: dbUser.id })),
        skipDuplicates: true,
      });
      console.log('  Default categories + payment types seeded');
    } else {
      console.log('  DB user already exists, reusing');
    }

    // Seed expenses (skip if already has some)
    const count = await prisma.expense.count({ where: { userId: dbUser.id } });
    if (count === 0) {
      const cats = await prisma.category.findMany({ where: { userId: dbUser.id } });
      const types = await prisma.paymentType.findMany({ where: { userId: dbUser.id } });
      await seedExpenses(dbUser.id, cats, types);
      console.log('  12 demo expenses seeded');
    } else {
      console.log(`  Already has ${count} expenses, skipping`);
    }
  }

  console.log('\n✅ Done! Demo credentials:');
  DEMO_USERS.forEach((u) => console.log(`  ${u.email}  /  ${u.password}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
