const prisma = require('../../lib/prisma');
const { computeJobCosts } = require('../../lib/jobCalc');

const JOB_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  location: { select: { id: true, name: true } },
  items: { include: { item: { select: { id: true, name: true, unit: true } } } },
};

const listJobs = async (req, res) => {
  const { status, locationId, customerId } = req.query;
  const jobs = await prisma.job.findMany({
    where: {
      businessId: req.businessId,
      ...(status     && { status }),
      ...(locationId && { locationId }),
      ...(customerId && { customerId }),
    },
    include: JOB_INCLUDE,
    orderBy: { orderDate: 'desc' },
  });
  res.json(jobs);
};

const getJob = async (req, res) => {
  const job = await prisma.job.findFirst({
    where: { id: req.params.id, businessId: req.businessId },
    include: JOB_INCLUDE,
  });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
};

const createJob = async (req, res) => {
  const {
    title, description, locationId, customerId,
    filamentItemId, gramsUsed, filamentCostPerKg, printTimeHr,
    printerCostRs, printerLifeHr, printerPowerW, electricityRateKwh,
    labourOn, labourRateHr, labourHandsOnMin,
    paymentFeePct, failureRatePct, targetMarginPct,
    deliveryCost, actualPrice, orderDate, deliveryDate, note,
    items = [],          // [{ itemId?, name, quantity, unitCost, type }]
  } = req.body;

  if (!title?.trim())   return res.status(400).json({ error: 'title required' });
  if (!locationId)      return res.status(400).json({ error: 'locationId required' });

  const settings = req.business.settings;

  const jobParams = {
    gramsUsed:          gramsUsed ?? 0,
    filamentCostPerKg:  filamentCostPerKg ?? 0,
    printTimeHr:        printTimeHr ?? 0,
    printerCostRs:      printerCostRs      ?? Number(settings?.printerCostRs      ?? 80000),
    printerLifeHr:      printerLifeHr      ?? Number(settings?.printerLifeHr      ?? 6000),
    printerPowerW:      printerPowerW      ?? Number(settings?.printerPowerW      ?? 160),
    electricityRateKwh: electricityRateKwh ?? Number(settings?.electricityRateKwh ?? 10),
    labourOn:           labourOn           ?? settings?.labourOnByDefault ?? true,
    labourRateHr:       labourRateHr       ?? Number(settings?.defaultLabourRateHr    ?? 150),
    labourHandsOnMin:   labourHandsOnMin   ?? 0,
    paymentFeePct:      paymentFeePct      ?? Number(settings?.defaultPaymentFeePct   ?? 0),
    failureRatePct:     failureRatePct     ?? Number(settings?.defaultFailureRatePct  ?? 10),
    targetMarginPct:    targetMarginPct    ?? Number(settings?.defaultTargetMarginPct ?? 50),
    deliveryCost:       deliveryCost       ?? 0,
    jobItems: items,
  };

  const costs = computeJobCosts(jobParams);
  const ap = actualPrice !== undefined && actualPrice !== '' ? Number(actualPrice) : null;
  const finalProfit  = ap !== null ? ap - Number(costs.trueCost) - (ap * Number(jobParams.paymentFeePct) / 100) : null;
  const finalMargin  = ap !== null && ap > 0 ? (finalProfit / ap) * 100 : null;

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        businessId: req.businessId,
        locationId,
        customerId: customerId || null,
        title: title.trim(),
        description: description?.trim() || null,
        filamentItemId: filamentItemId || null,
        gramsUsed:          jobParams.gramsUsed,
        filamentCostPerKg:  jobParams.filamentCostPerKg,
        printTimeHr:        jobParams.printTimeHr,
        printerCostRs:      jobParams.printerCostRs,
        printerLifeHr:      jobParams.printerLifeHr,
        printerPowerW:      jobParams.printerPowerW,
        electricityRateKwh: jobParams.electricityRateKwh,
        labourOn:           jobParams.labourOn,
        labourRateHr:       jobParams.labourRateHr,
        labourHandsOnMin:   jobParams.labourHandsOnMin,
        paymentFeePct:      jobParams.paymentFeePct,
        failureRatePct:     jobParams.failureRatePct,
        targetMarginPct:    jobParams.targetMarginPct,
        deliveryCost:       jobParams.deliveryCost,
        materialCost:       costs.materialCost,
        electricityCost:    costs.electricityCost,
        depreciationCost:   costs.depreciationCost,
        labourCost:         costs.labourCost,
        packagingCost:      costs.packagingCost,
        addOnsCost:         costs.addOnsCost,
        failureMarkup:      costs.failureMarkup,
        trueCost:           costs.trueCost,
        suggestedPrice:     costs.suggestedPrice,
        actualPrice:        ap,
        profit:             finalProfit,
        marginPct:          finalMargin,
        orderDate:          orderDate  ? new Date(orderDate)  : new Date(),
        deliveryDate:       deliveryDate ? new Date(deliveryDate) : null,
        note: note || null,
        items: {
          create: items.map(i => ({
            itemId: i.itemId || null, name: i.name, quantity: Number(i.quantity),
            unitCost: Number(i.unitCost), totalCost: Number(i.quantity) * Number(i.unitCost), type: i.type,
          })),
        },
      },
      include: JOB_INCLUDE,
    });

    // Deduct filament from stock immediately
    if (filamentItemId && gramsUsed && Number(gramsUsed) > 0) {
      const filItem = await tx.inventoryItem.findFirst({ where: { id: filamentItemId, businessId: req.businessId } });
      if (filItem) {
        const deductQty = filItem.unit === 'KG' ? Number(gramsUsed) / 1000 : Number(gramsUsed);
        await tx.inventoryStock.upsert({
          where: { itemId_locationId: { itemId: filamentItemId, locationId } },
          create: { itemId: filamentItemId, locationId, quantity: -deductQty },
          update: { quantity: { decrement: deductQty } },
        });
        await tx.inventoryTransaction.create({
          data: { itemId: filamentItemId, locationId, type: 'JOB_USE', quantity: -deductQty,
            unitCost: Number(filItem.costPrice), totalCost: deductQty * Number(filItem.costPrice),
            jobId: created.id, note: `Job: ${title}` },
        });
      }
    }

    // Deduct inventory-linked job items
    for (const item of items) {
      if (!item.itemId) continue;
      const qty = Number(item.quantity);
      await tx.inventoryStock.upsert({
        where: { itemId_locationId: { itemId: item.itemId, locationId } },
        create: { itemId: item.itemId, locationId, quantity: -qty },
        update: { quantity: { decrement: qty } },
      });
      await tx.inventoryTransaction.create({
        data: { itemId: item.itemId, locationId, type: 'JOB_USE', quantity: -qty,
          unitCost: Number(item.unitCost), totalCost: qty * Number(item.unitCost),
          jobId: created.id, note: `Job: ${title}` },
      });
    }

    return created;
  });

  res.status(201).json(job);
};

const updateJob = async (req, res) => {
  const { status, actualPrice, note, deliveryDate } = req.body;
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, businessId: req.businessId } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const ap = actualPrice !== undefined && actualPrice !== '' ? Number(actualPrice) : existing.actualPrice;
  const tc = Number(existing.trueCost);
  const pf = Number(existing.paymentFeePct);
  const profit   = ap !== null ? ap - tc - (ap * pf / 100) : null;
  const marginPct = ap !== null && ap > 0 ? (profit / ap) * 100 : null;

  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: {
      ...(status       !== undefined && { status }),
      ...(actualPrice  !== undefined && { actualPrice: ap, profit, marginPct }),
      ...(note         !== undefined && { note }),
      ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
    },
    include: JOB_INCLUDE,
  });
  res.json(job);
};

module.exports = { listJobs, getJob, createJob, updateJob };
