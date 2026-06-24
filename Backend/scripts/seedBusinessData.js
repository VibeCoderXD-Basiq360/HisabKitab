require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const vikramUser = await prisma.user.findUnique({ where: { email: 'vikram@hisabkitab.demo' } });
  if (!vikramUser) { console.error('vikram user not found'); process.exit(1); }

  const bizPartner = await prisma.businessPartner.findFirst({
    where: { userId: vikramUser.id, status: 'ACTIVE' },
    include: { business: { include: { locations: true } } },
  });
  if (!bizPartner) { console.error('No active business for vikram'); process.exit(1); }

  const biz = bizPartner.business;
  const loc1 = biz.locations[0];
  const loc2 = biz.locations[1];
  console.log(`Business: ${biz.name} | Locs: ${biz.locations.map(l=>l.name).join(', ')}`);

  const accounts = await prisma.account.findMany({ where: { userId: vikramUser.id } });
  const savings  = accounts.find(a => a.type === 'SAVINGS');
  const current  = accounts.find(a => a.type === 'CURRENT');
  console.log(`Accounts: savings=${savings?.name}, current=${current?.name}`);

  // ── Inventory ────────────────────────────────────────────────────────────
  const invCount = await prisma.inventoryItem.count({ where: { businessId: biz.id } });
  if (invCount === 0) {
    await prisma.inventoryItem.create({ data: {
      businessId: biz.id, name: 'PLA Filament — White 1kg', sku: 'PLA-WHT-1KG',
      category: 'FILAMENT', unit: 'KG', costPrice: 1200, lowStockThreshold: 2,
      stocks: { create: [{ locationId: loc1.id, quantity: 8 }, { locationId: loc2.id, quantity: 3 }] },
    }});
    await prisma.inventoryItem.create({ data: {
      businessId: biz.id, name: 'ABS Filament — Black 1kg', sku: 'ABS-BLK-1KG',
      category: 'FILAMENT', unit: 'KG', costPrice: 1400, lowStockThreshold: 2,
      stocks: { create: [{ locationId: loc1.id, quantity: 5 }, { locationId: loc2.id, quantity: 1 }] },
    }});
    await prisma.inventoryItem.create({ data: {
      businessId: biz.id, name: 'Clear Resin 500ml', sku: 'RESIN-CLR-500',
      category: 'OTHER', unit: 'PIECE', costPrice: 800, lowStockThreshold: 1,
      stocks: { create: [{ locationId: loc1.id, quantity: 4 }] },
    }});
    console.log('✅ 3 inventory items seeded');
  } else { console.log(`⚠  Inventory already has ${invCount} items`); }

  // ── Customers ────────────────────────────────────────────────────────────
  const custCount = await prisma.customer.count({ where: { businessId: biz.id } });
  if (custCount === 0) {
    const cust1 = await prisma.customer.create({ data: {
      businessId: biz.id, name: 'Rajesh Gupta', phone: '9871234560',
      email: 'rajesh.gupta@techcorp.in',
    }});
    const cust2 = await prisma.customer.create({ data: {
      businessId: biz.id, name: 'Meera Nair', phone: '9812345678',
      email: 'meera.nair@designstudio.com',
    }});
    const cust3 = await prisma.customer.create({ data: {
      businessId: biz.id, name: 'Startup Hub Delhi', phone: '9900112233',
      email: 'orders@startuphub.in',
    }});
    console.log('✅ 3 customers seeded');

    // ── Jobs ────────────────────────────────────────────────────────────────
    const now = new Date();
    const d = days => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

    await prisma.job.create({ data: {
      businessId: biz.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Mechanical Gear Set — 12 pieces', status: 'DELIVERED',
      printTimeHr: 6.5, materialCost: 850, failureRatePct: 8, targetMarginPct: 35,
      suggestedPrice: 3200, actualPrice: 3200, profit: 2350, marginPct: 73,
      creditAccountId: savings?.id, creditRecorded: true,
      orderDate: d(18), deliveryDate: d(14),
      note: 'PLA white, 0.2mm layer height. Customer very happy.',
    }});
    await prisma.job.create({ data: {
      businessId: biz.id, locationId: loc1.id, customerId: cust2.id,
      title: 'Architectural Scale Model', status: 'DELIVERED',
      printTimeHr: 14, materialCost: 1800, failureRatePct: 5, targetMarginPct: 40,
      suggestedPrice: 7500, actualPrice: 8000, profit: 6200, marginPct: 77.5,
      creditAccountId: current?.id, creditRecorded: true,
      orderDate: d(25), deliveryDate: d(20),
      note: 'White resin finish. Rush delivery charged extra.',
    }});
    await prisma.job.create({ data: {
      businessId: biz.id, locationId: loc2.id, customerId: cust3.id,
      title: 'Logo Standees × 50 units', status: 'IN_PROGRESS',
      printTimeHr: 20, materialCost: 3200, failureRatePct: 10, targetMarginPct: 30,
      suggestedPrice: 12000, orderDate: d(5),
      note: 'ABS black. Partial batch printed, second batch tomorrow.',
    }});
    await prisma.job.create({ data: {
      businessId: biz.id, locationId: loc1.id, customerId: cust1.id,
      title: 'Custom Phone Stands × 10', status: 'QUOTED',
      printTimeHr: 3, materialCost: 420, failureRatePct: 8, targetMarginPct: 35,
      suggestedPrice: 1800, orderDate: d(2),
    }});
    await prisma.job.create({ data: {
      businessId: biz.id, locationId: loc2.id, customerId: cust2.id,
      title: 'Prototype — Medical Device Housing', status: 'PRINTED',
      printTimeHr: 8, materialCost: 950, failureRatePct: 6, targetMarginPct: 45,
      suggestedPrice: 5500, orderDate: d(8),
      note: 'Resin clear. Awaiting customer inspection.',
    }});
    console.log('✅ 5 jobs seeded (DELIVERED×2, IN_PROGRESS, QUOTED, PRINTED)');
  } else { console.log(`⚠  Already has ${custCount} customers`); }

  // ── Business Expenses ────────────────────────────────────────────────────
  const expCount = await prisma.businessExpense.count({ where: { businessId: biz.id } });
  if (expCount === 0) {
    const now = new Date();
    const d = days => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
    await prisma.businessExpense.createMany({ data: [
      { businessId: biz.id, locationId: loc1.id, category: 'Materials', amount: 6000,
        vendor: 'Filament India Pvt Ltd', date: d(20), note: 'Bulk PLA order — 5 rolls', accountId: current?.id },
      { businessId: biz.id, locationId: loc1.id, category: 'Utilities', amount: 2800,
        vendor: 'BSES Delhi', date: d(15), note: 'Electricity — printers running overnight', accountId: current?.id },
      { businessId: biz.id, locationId: loc2.id, category: 'Rent', amount: 18000,
        vendor: 'CP Commercial Properties', date: d(10), note: 'Monthly studio rent', accountId: current?.id },
      { businessId: biz.id, locationId: loc1.id, category: 'Equipment', amount: 3500,
        vendor: 'Creality India', date: d(7), note: 'Nozzle kit + bed spring replacement', accountId: savings?.id },
      { businessId: biz.id, locationId: loc2.id, category: 'Marketing', amount: 1200,
        vendor: 'Justdial', date: d(3), note: 'Business listing premium', accountId: current?.id },
    ]});
    console.log('✅ 5 business expenses seeded');
  } else { console.log(`⚠  Already has ${expCount} business expenses`); }

  // ── Income for delivered jobs ────────────────────────────────────────────
  const incomeCount = await prisma.income.count({ where: { userId: vikramUser.id, category: 'BUSINESS' } });
  if (incomeCount === 0) {
    const now = new Date();
    const d = days => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
    if (savings) {
      await prisma.income.create({ data: {
        userId: vikramUser.id, amount: 3200,
        title: 'Job: Mechanical Gear Set — 12 pieces',
        category: 'BUSINESS', source: 'PrintX Studio',
        incomeDate: d(14), accountId: savings.id, note: 'Job payment recorded',
      }});
    }
    if (current) {
      await prisma.income.create({ data: {
        userId: vikramUser.id, amount: 8000,
        title: 'Job: Architectural Scale Model',
        category: 'BUSINESS', source: 'PrintX Studio',
        incomeDate: d(20), accountId: current.id, note: 'Job payment recorded',
      }});
    }
    console.log('✅ 2 income records seeded for delivered jobs');
  } else { console.log(`⚠  Already has ${incomeCount} business income records`); }

  console.log('\n✅ All done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
