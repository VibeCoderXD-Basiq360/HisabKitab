require('dotenv').config();
const admin = require('../src/config/firebase');
const prisma = require('../src/lib/prisma');
// New demo accounts focused on business features
const DEMO_USERS = [
  { email: 'vikram@hisabkitab.demo', password: 'Demo@1234', name: 'Vikram Arora' },
  { email: 'neha@hisabkitab.demo',   password: 'Demo@1234', name: 'Neha Singh' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#FF5722' },
  { name: 'Transport', icon: '🚌', color: '#2196F3' },
  { name: 'Fuel', icon: '⛽', color: '#FF9800' },
  { name: 'Grocery', icon: '🛒', color: '#4CAF50' },
  { name: 'Medical', icon: '💊', color: '#F44336' },
  { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
  { name: 'Bills', icon: '📄', color: '#607D8B' },
  { name: 'Shopping', icon: '🛍️', color: '#E91E63' },
];

const DEFAULT_PAYMENT_TYPES = [
  { name: 'Cash',        icon: '💵', color: '#4CAF50', isDefault: true },
  { name: 'UPI',         icon: '📱', color: '#2196F3', isDefault: false },
  { name: 'Credit Card', icon: '💳', color: '#9C27B0', isDefault: false },
  { name: 'Debit Card',  icon: '🏦', color: '#FF5722', isDefault: false },
];

async function createOrGetUser(demo) {
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().getUserByEmail(demo.email);
    console.log(`  Firebase user exists: ${demo.email}`);
  } catch {
    firebaseUser = await admin.auth().createUser({
      email: demo.email, password: demo.password,
      displayName: demo.name, emailVerified: true,
    });
    console.log(`  Firebase user created: ${demo.email}`);
  }

  let dbUser = await prisma.user.findUnique({ where: { firebaseUid: firebaseUser.uid } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { firebaseUid: firebaseUser.uid, email: demo.email, name: demo.name },
    });
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId: dbUser.id })), skipDuplicates: true,
    });
    await prisma.paymentType.createMany({
      data: DEFAULT_PAYMENT_TYPES.map(p => ({ ...p, userId: dbUser.id })), skipDuplicates: true,
    });
    console.log(`  DB user + defaults created`);
  } else {
    console.log(`  DB user exists`);
  }
  return dbUser;
}

async function seedPersonalExpenses(userId) {
  const count = await prisma.expense.count({ where: { userId } });
  if (count > 0) { console.log(`  Already has ${count} expenses, skipping`); return; }

  const cats  = await prisma.category.findMany({ where: { userId } });
  const types = await prisma.paymentType.findMany({ where: { userId } });
  const cat  = n => cats.find(c => c.name === n)?.id;
  const type = n => types.find(t => t.name === n)?.id;
  const now  = new Date();
  const d    = days => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  await prisma.expense.createMany({ data: [
    { userId, amount: 340,  title: 'Dinner — Smoke House',    categoryId: cat('Food'),          paymentTypeId: type('UPI'),         expenseDate: d(0),  currency: 'INR' },
    { userId, amount: 120,  title: 'Auto to metro',           categoryId: cat('Transport'),     paymentTypeId: type('Cash'),        expenseDate: d(1),  currency: 'INR' },
    { userId, amount: 2100, title: 'Monthly grocery',         categoryId: cat('Grocery'),       paymentTypeId: type('Debit Card'),  expenseDate: d(3),  currency: 'INR' },
    { userId, amount: 650,  title: 'Electricity bill',        categoryId: cat('Bills'),         paymentTypeId: type('UPI'),         expenseDate: d(5),  currency: 'INR' },
    { userId, amount: 299,  title: 'Netflix',                 categoryId: cat('Entertainment'), paymentTypeId: type('Credit Card'), expenseDate: d(7),  currency: 'INR' },
    { userId, amount: 480,  title: 'Fuel — HP petrol pump',   categoryId: cat('Fuel'),          paymentTypeId: type('Cash'),        expenseDate: d(9),  currency: 'INR' },
    { userId, amount: 1200, title: 'Shirt — Zara',            categoryId: cat('Shopping'),      paymentTypeId: type('Credit Card'), expenseDate: d(12), currency: 'INR' },
    { userId, amount: 280,  title: 'Pharmacy — Apollo',       categoryId: cat('Medical'),       paymentTypeId: type('Cash'),        expenseDate: d(14), currency: 'INR' },
  ]});
  console.log('  8 personal expenses seeded');
}

async function seedAccounts(userId) {
  const existing = await prisma.account.count({ where: { userId } });
  if (existing > 0) { console.log('  Accounts already exist'); return null; }

  const savings = await prisma.account.create({ data: {
    userId, name: 'HDFC Savings', type: 'SAVINGS', icon: '🏦', color: '#2196F3', openingBalance: 45000,
  }});
  const current = await prisma.account.create({ data: {
    userId, name: 'ICICI Current', type: 'CURRENT', icon: '🏢', color: '#4CAF50', openingBalance: 80000,
  }});
  console.log('  2 accounts seeded (HDFC Savings, ICICI Current)');
  return { savings, current };
}

async function seedBusiness(ownerUser, partnerUser) {
  const existing = await prisma.businessPartner.findFirst({ where: { userId: ownerUser.id, status: 'ACTIVE' } });
  if (existing) { console.log('  Business already exists'); return null; }

  const now = new Date();
  const d = days => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  const business = await prisma.business.create({
    data: {
      name: 'PrintX Studio',
      tagline: '3D Printing & Rapid Prototyping',
      settings: { create: {
        printerCostRs: 45000, printerLifeHr: 2000, printerPowerW: 250,
        electricityRateKwh: 8, defaultLabourRateHr: 150, labourOnByDefault: true,
        defaultFailureRatePct: 8, defaultTargetMarginPct: 35,
      }},
      partners: { create: { userId: ownerUser.id, role: 'OWNER', status: 'ACTIVE', equityPct: 60, profitSharePct: 60 } },
      locations: { create: [{ name: 'Noida Sector 62' }, { name: 'Delhi Connaught Place' }] },
    },
    include: { locations: true, partners: true },
  });
  console.log('  Business "PrintX Studio" created');

  // Invite partner (PENDING — to test invite flow)
  const partnerInvite = await prisma.businessPartner.create({
    data: {
      businessId: business.id, userId: partnerUser.id,
      role: 'PARTNER', status: 'PENDING', equityPct: 40, profitSharePct: 40,
    },
  });
  console.log(`  Partner invite sent to ${partnerUser.email} (PENDING — ready to test accept/decline)`);

  const loc1 = business.locations[0];
  const loc2 = business.locations[1];

  // Inventory items
  const pla = await prisma.inventoryItem.create({ data: {
    businessId: business.id, name: 'PLA Filament — White 1kg', sku: 'PLA-WHT-1KG',
    category: 'FILAMENT', unit: 'KG', costPrice: 1200, sellingPrice: 1800, reorderPoint: 2,
    stocks: { create: [
      { locationId: loc1.id, quantity: 8 },
      { locationId: loc2.id, quantity: 3 },
    ]},
  }});
  const abs = await prisma.inventoryItem.create({ data: {
    businessId: business.id, name: 'ABS Filament — Black 1kg', sku: 'ABS-BLK-1KG',
    category: 'FILAMENT', unit: 'KG', costPrice: 1400, sellingPrice: 2100, reorderPoint: 2,
    stocks: { create: [
      { locationId: loc1.id, quantity: 5 },
      { locationId: loc2.id, quantity: 1 },
    ]},
  }});
  const resin = await prisma.inventoryItem.create({ data: {
    businessId: business.id, name: 'Resin — Clear 500ml', sku: 'RESIN-CLR-500',
    category: 'OTHER', unit: 'PIECE', costPrice: 800, sellingPrice: 1400, reorderPoint: 1,
    stocks: { create: [{ locationId: loc1.id, quantity: 4 }]},
  }});
  console.log('  3 inventory items seeded');

  // Customers
  const cust1 = await prisma.businessCustomer.create({ data: {
    businessId: business.id, name: 'Rajesh Gupta', phone: '9871234560',
    email: 'rajesh.gupta@techcorp.in', address: 'B-42, Sector 18, Noida',
  }});
  const cust2 = await prisma.businessCustomer.create({ data: {
    businessId: business.id, name: 'Meera Nair', phone: '9812345678',
    email: 'meera.nair@designstudio.com', address: '14 Lodhi Colony, Delhi',
  }});
  const cust3 = await prisma.businessCustomer.create({ data: {
    businessId: business.id, name: 'Startup Hub Delhi', phone: '9900112233',
    email: 'orders@startuphub.in',
  }});
  console.log('  3 customers seeded');

  // Get owner accounts
  const ownerAccounts = await prisma.account.findMany({ where: { userId: ownerUser.id } });
  const savingsAcc = ownerAccounts.find(a => a.type === 'SAVINGS');
  const currentAcc = ownerAccounts.find(a => a.type === 'CURRENT');

  // Jobs with varying statuses
  const jobs = [
    {
      businessId: business.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Mechanical Gear Set — 12 pieces', status: 'DELIVERED',
      printTimeHr: 6.5, materialCostRs: 850, failureRatePct: 8, targetMarginPct: 35,
      suggestedPrice: 3200, actualPrice: 3200,
      creditAccountId: savingsAcc?.id, creditRecorded: true,
      orderDate: d(18), deliveryDate: d(14),
      note: 'PLA white, 0.2mm layer height. Customer very happy.',
    },
    {
      businessId: business.id, locationId: loc1.id, customerId: cust2.id,
      title: 'Architectural Scale Model', status: 'DELIVERED',
      printTimeHr: 14, materialCostRs: 1800, failureRatePct: 5, targetMarginPct: 40,
      suggestedPrice: 7500, actualPrice: 8000,
      creditAccountId: currentAcc?.id, creditRecorded: true,
      orderDate: d(25), deliveryDate: d(20),
      note: 'White resin finish. Rush delivery charged extra.',
    },
    {
      businessId: business.id, locationId: loc2.id, customerId: cust3.id,
      title: 'Logo Standees × 50 units', status: 'IN_PROGRESS',
      printTimeHr: 20, materialCostRs: 3200, failureRatePct: 10, targetMarginPct: 30,
      suggestedPrice: 12000, actualPrice: null,
      orderDate: d(5),
      note: 'ABS black. Partial batch printed, second batch tomorrow.',
    },
    {
      businessId: business.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Custom Phone Stands × 10', status: 'QUOTED',
      printTimeHr: 3, materialCostRs: 420, failureRatePct: 8, targetMarginPct: 35,
      suggestedPrice: 1800, actualPrice: null,
      orderDate: d(2),
    },
    {
      businessId: business.id, locationId: loc2.id, customerId: cust2.id,
      title: 'Prototype — Medical Device Housing', status: 'PRINTED',
      printTimeHr: 8, materialCostRs: 950, failureRatePct: 6, targetMarginPct: 45,
      suggestedPrice: 5500, actualPrice: null,
      orderDate: d(8),
      note: 'Resin clear. Awaiting customer inspection.',
    },
  ];

  for (const job of jobs) {
    await prisma.businessJob.create({ data: job });
  }
  console.log('  5 jobs seeded (DELIVERED ×2, IN_PROGRESS, QUOTED, PRINTED)');

  // Business expenses
  const expenses = [
    { businessId: business.id, locationId: loc1.id, category: 'Materials', amount: 6000,
      vendor: 'Filament India Pvt Ltd', date: d(20), note: 'Bulk PLA order — 5 rolls',
      accountId: currentAcc?.id },
    { businessId: business.id, locationId: loc1.id, category: 'Utilities', amount: 2800,
      vendor: 'BSES Delhi', date: d(15), note: 'Electricity — printers running overnight',
      accountId: currentAcc?.id },
    { businessId: business.id, locationId: loc2.id, category: 'Rent', amount: 18000,
      vendor: 'CP Commercial Properties', date: d(10), note: 'Monthly studio rent',
      accountId: currentAcc?.id },
    { businessId: business.id, locationId: loc1.id, category: 'Equipment', amount: 3500,
      vendor: 'Creality India', date: d(7), note: 'Nozzle kit + bed spring replacement',
      accountId: savingsAcc?.id },
    { businessId: business.id, locationId: loc2.id, category: 'Marketing', amount: 1200,
      vendor: 'Justdial', date: d(3), note: 'Business listing premium',
      accountId: currentAcc?.id },
  ];

  for (const exp of expenses) {
    await prisma.businessExpense.create({ data: exp });
  }
  console.log('  5 business expenses seeded');

  // Record income for delivered jobs
  if (savingsAcc) {
    await prisma.income.create({ data: {
      userId: ownerUser.id, amount: 3200, title: 'Job: Mechanical Gear Set — 12 pieces',
      category: 'BUSINESS', source: 'PrintX Studio',
      incomeDate: d(14), accountId: savingsAcc.id, note: 'Job payment recorded',
    }});
  }
  if (currentAcc) {
    await prisma.income.create({ data: {
      userId: ownerUser.id, amount: 8000, title: 'Job: Architectural Scale Model',
      category: 'BUSINESS', source: 'PrintX Studio',
      incomeDate: d(20), accountId: currentAcc.id, note: 'Job payment recorded',
    }});
  }
  console.log('  2 income records seeded for delivered jobs');

  return { business, partnerInvite };
}

async function main() {
  console.log('=== Seeding Business Demo Accounts ===\n');

  // Create both users
  console.log('► Creating Vikram Arora (Business Owner)...');
  const vikram = await createOrGetUser(DEMO_USERS[0]);
  const vikramAccounts = await seedAccounts(vikram.id);
  await seedPersonalExpenses(vikram.id);

  console.log('\n► Creating Neha Singh (Invited Partner)...');
  const neha = await createOrGetUser(DEMO_USERS[1]);
  await seedAccounts(neha.id);
  await seedPersonalExpenses(neha.id);

  console.log('\n► Setting up PrintX Studio business...');
  await seedBusiness(vikram, neha);

  console.log('\n✅ Done!\n');
  console.log('Demo credentials:');
  console.log('─────────────────────────────────────────────');
  DEMO_USERS.forEach(u => console.log(`  ${u.email.padEnd(32)} ${u.password}`));
  console.log('─────────────────────────────────────────────');
  console.log('\nTest flows ready:');
  console.log('  1. Login as vikram@ → go to /business → see PrintX Studio dashboard');
  console.log('  2. Login as neha@   → go to /business → see pending invite card → Accept & Join');
  console.log('  3. Vikram: Business → Settings → Partners → see ⏳ Pending badge for Neha');
  console.log('  4. Vikram: Business → Jobs → tap delivered job → account credited');
  console.log('  5. Vikram: Business → Expenses → see expenses debiting accounts');
  console.log('  6. Vikram: Home → see business expenses with 🏭 badge');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
