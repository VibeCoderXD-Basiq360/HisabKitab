require('dotenv').config();
const prisma = require('./src/lib/prisma');

const MAIN_EMAIL = 'hisabkitab.notify@gmail.com';

async function main() {
  console.log('🏭  Seeding business demo for main account…\n');

  const user = await prisma.user.findFirst({ where: { email: MAIN_EMAIL } });
  if (!user) { console.error('❌ Main user not found. Run seed-demo.js first.'); process.exit(1); }
  console.log(`✅ Found main user: ${user.email} (${user.id})`);

  // Skip if business already exists
  const existing = await prisma.businessPartner.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
  if (existing) {
    console.log('⚠️  Business already exists for main user. Skipping.');
    return;
  }

  const now = new Date();
  const d = (days) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  // ── Business ─────────────────────────────────────────────────────────────
  const business = await prisma.business.create({
    data: {
      name: 'PrintX Studio',
      tagline: '3D Printing & Rapid Prototyping',
      settings: {
        create: {
          printerCostRs: 45000, printerLifeHr: 2000, printerPowerW: 250,
          electricityRateKwh: 8, defaultLabourRateHr: 150, labourOnByDefault: true,
          defaultFailureRatePct: 8, defaultTargetMarginPct: 35,
        },
      },
      partners: {
        create: { userId: user.id, role: 'OWNER', status: 'ACTIVE', equityPct: 100, profitSharePct: 100 },
      },
      locations: {
        create: [{ name: 'Noida Sector 62' }, { name: 'Delhi Connaught Place' }],
      },
    },
    include: { locations: true },
  });
  console.log(`✅ Business "PrintX Studio" created (${business.id})`);

  const loc1 = business.locations[0];
  const loc2 = business.locations[1];

  // ── Accounts for credit ──────────────────────────────────────────────────
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const savings  = accounts.find(a => a.name.includes('HDFC') && a.type === 'SAVINGS');
  const current  = accounts.find(a => a.type === 'CURRENT') || accounts[0];

  // ── Inventory ─────────────────────────────────────────────────────────────
  const [pla, abs, resin] = await Promise.all([
    prisma.inventoryItem.create({ data: {
      businessId: business.id, name: 'PLA Filament — White 1kg', sku: 'PLA-WHT-1KG',
      category: 'FILAMENT', unit: 'KG', costPrice: 1200, lowStockThreshold: 2,
      stocks: { create: [{ locationId: loc1.id, quantity: 8 }, { locationId: loc2.id, quantity: 3 }] },
    }}),
    prisma.inventoryItem.create({ data: {
      businessId: business.id, name: 'ABS Filament — Black 1kg', sku: 'ABS-BLK-1KG',
      category: 'FILAMENT', unit: 'KG', costPrice: 1400, lowStockThreshold: 2,
      stocks: { create: [{ locationId: loc1.id, quantity: 5 }, { locationId: loc2.id, quantity: 1 }] },
    }}),
    prisma.inventoryItem.create({ data: {
      businessId: business.id, name: 'Resin — Clear 500ml', sku: 'RESIN-CLR-500',
      category: 'OTHER', unit: 'PIECE', costPrice: 800, lowStockThreshold: 1,
      stocks: { create: [{ locationId: loc1.id, quantity: 4 }] },
    }}),
  ]);
  console.log('✅ 3 inventory items created');

  // ── Customers ─────────────────────────────────────────────────────────────
  const [cust1, cust2, cust3] = await Promise.all([
    prisma.customer.create({ data: {
      businessId: business.id, name: 'Rajesh Gupta', phone: '9871234560',
      email: 'rajesh.gupta@techcorp.in', note: 'Repeat customer — always wants fast delivery',
    }}),
    prisma.customer.create({ data: {
      businessId: business.id, name: 'Meera Nair', phone: '9812345678',
      email: 'meera.nair@designstudio.com', note: 'Architect — prefers white resin finish',
    }}),
    prisma.customer.create({ data: {
      businessId: business.id, name: 'Startup Hub Delhi', phone: '9900112233',
      email: 'orders@startuphub.in', note: 'Bulk orders, net-30 payment terms',
    }}),
  ]);
  console.log('✅ 3 customers created');

  // ── Jobs ──────────────────────────────────────────────────────────────────
  await Promise.all([
    // Delivered — Rajesh, Noida
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Mechanical Gear Set — 12 pieces', status: 'DELIVERED',
      printTimeHr: 6.5, materialCost: 850, electricityCost: 130, depreciationCost: 195,
      labourCost: 450, trueCost: 1625, suggestedPrice: 3200, actualPrice: 3200,
      profit: 1575, marginPct: 49.2, failureRatePct: 8, targetMarginPct: 35,
      creditAccountId: savings?.id, creditRecorded: true,
      orderDate: d(18), deliveryDate: d(14),
      note: 'PLA white, 0.2mm layer height. Customer very happy.',
    }}),
    // Delivered — Meera, Delhi
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc2.id, customerId: cust2.id,
      title: 'Architectural Scale Model', status: 'DELIVERED',
      printTimeHr: 14, materialCost: 1800, electricityCost: 280, depreciationCost: 420,
      labourCost: 900, trueCost: 3400, suggestedPrice: 7500, actualPrice: 8000,
      profit: 4600, marginPct: 57.5, failureRatePct: 5, targetMarginPct: 40,
      creditAccountId: savings?.id, creditRecorded: true,
      orderDate: d(25), deliveryDate: d(20),
      note: 'White resin finish. Rush delivery charged extra.',
    }}),
    // In Progress — Startup Hub, Delhi
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc2.id, customerId: cust3.id,
      title: 'Logo Standees × 50 units', status: 'IN_PROGRESS',
      printTimeHr: 20, materialCost: 3200, electricityCost: 400, depreciationCost: 600,
      labourCost: 1500, trueCost: 5700, suggestedPrice: 12000,
      failureRatePct: 10, targetMarginPct: 30,
      orderDate: d(5),
      note: 'ABS black. Partial batch printed, second batch tomorrow.',
    }}),
    // Quoted — Rajesh, Noida
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Custom Phone Stands × 10', status: 'QUOTED',
      printTimeHr: 3, materialCost: 420, electricityCost: 60, depreciationCost: 90,
      labourCost: 300, trueCost: 870, suggestedPrice: 1800,
      failureRatePct: 8, targetMarginPct: 35,
      orderDate: d(2),
    }}),
    // Printed — Meera, Noida
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc1.id, customerId: cust2.id,
      title: 'Prototype — Medical Device Housing', status: 'PRINTED',
      printTimeHr: 8, materialCost: 950, electricityCost: 160, depreciationCost: 240,
      labourCost: 600, trueCost: 1950, suggestedPrice: 5500,
      failureRatePct: 6, targetMarginPct: 45,
      orderDate: d(8),
      note: 'Resin clear. Awaiting customer inspection.',
    }}),
    // Cancelled — Startup Hub
    prisma.job.create({ data: {
      businessId: business.id, locationId: loc2.id, customerId: cust3.id,
      title: 'Exhibition Display Stand × 5', status: 'CANCELLED',
      printTimeHr: 10, materialCost: 1500, trueCost: 2800, suggestedPrice: 6000,
      failureRatePct: 10, targetMarginPct: 35,
      orderDate: d(30),
      note: 'Customer cancelled — event postponed.',
    }}),
  ]);
  console.log('✅ 6 jobs created (DELIVERED ×2, IN_PROGRESS, QUOTED, PRINTED, CANCELLED)');

  // ── Business Expenses ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc1.id, category: 'Materials', amount: 6000,
      vendor: 'Filament India Pvt Ltd', date: d(20), note: 'Bulk PLA order — 5 rolls',
      accountId: current?.id,
    }}),
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc1.id, category: 'Utilities', amount: 2800,
      vendor: 'BSES Delhi', date: d(15), note: 'Electricity — printers running overnight',
      accountId: current?.id,
    }}),
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc2.id, category: 'Rent', amount: 18000,
      vendor: 'CP Commercial Properties', date: d(10), note: 'Monthly studio rent',
      accountId: current?.id,
    }}),
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc1.id, category: 'Equipment', amount: 3500,
      vendor: 'Creality India', date: d(7), note: 'Nozzle kit + bed spring replacement',
      accountId: savings?.id,
    }}),
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc2.id, category: 'Marketing', amount: 1200,
      vendor: 'Justdial', date: d(3), note: 'Business listing premium',
      accountId: current?.id,
    }}),
    prisma.businessExpense.create({ data: {
      businessId: business.id, locationId: loc1.id, category: 'Maintenance', amount: 800,
      vendor: 'Local Electrician', date: d(12), note: 'Panel wiring check',
      accountId: savings?.id,
    }}),
  ]);
  console.log('✅ 6 business expenses created');

  // ── Income for delivered jobs ─────────────────────────────────────────────
  await Promise.all([
    prisma.income.create({ data: {
      userId: user.id, amount: 3200, title: 'Job: Mechanical Gear Set — 12 pieces',
      category: 'BUSINESS', source: 'PrintX Studio',
      incomeDate: d(14), accountId: savings?.id, note: 'Job payment received',
    }}),
    prisma.income.create({ data: {
      userId: user.id, amount: 8000, title: 'Job: Architectural Scale Model',
      category: 'BUSINESS', source: 'PrintX Studio',
      incomeDate: d(20), accountId: savings?.id, note: 'Rush delivery + resin finish',
    }}),
  ]);
  console.log('✅ 2 income records for delivered jobs');

  console.log(`
╔══════════════════════════════════════════════════════════╗
║       🎉  Business Demo Seeded!                          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Account : hisabkitab.notify@gmail.com                   ║
║  Business: PrintX Studio (3D Printing)                   ║
║                                                          ║
║  📦  3 inventory items (PLA, ABS, Resin)                 ║
║  👥  3 customers                                         ║
║  🔧  6 jobs (delivered ×2, in-progress, quoted,          ║
║       printed, cancelled)                                ║
║  💸  6 business expenses                                 ║
║  💰  2 income records (₹11,200 from delivered jobs)      ║
║  📍  2 locations (Noida, Delhi)                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
