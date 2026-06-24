const prisma = require('../../lib/prisma');

// ── Items ─────────────────────────────────────────────────────────────────────

const listItems = async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: { businessId: req.businessId },
    include: { stocks: { include: { location: { select: { id: true, name: true } } } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(items);
};

const createItem = async (req, res) => {
  const { name, sku, category, unit, costPrice, lowStockThreshold } = req.body;
  if (!name?.trim() || !category || !unit || costPrice === undefined)
    return res.status(400).json({ error: 'name, category, unit, costPrice required' });

  const item = await prisma.inventoryItem.create({
    data: { businessId: req.businessId, name: name.trim(), sku: sku || null, category, unit,
      costPrice: Number(costPrice), lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null },
  });
  res.status(201).json(item);
};

const updateItem = async (req, res) => {
  const { name, sku, costPrice, lowStockThreshold, isActive } = req.body;
  const item = await prisma.inventoryItem.updateMany({
    where: { id: req.params.id, businessId: req.businessId },
    data: {
      ...(name             !== undefined && { name: name.trim() }),
      ...(sku              !== undefined && { sku: sku || null }),
      ...(costPrice        !== undefined && { costPrice: Number(costPrice) }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null }),
      ...(isActive         !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json(item);
};

// ── Stock ─────────────────────────────────────────────────────────────────────

// POST /inventory/stock/add — purchase / restock
const addStock = async (req, res) => {
  const { itemId, locationId, quantity, unitCost, note, date } = req.body;
  if (!itemId || !locationId || !quantity)
    return res.status(400).json({ error: 'itemId, locationId, quantity required' });

  const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, businessId: req.businessId } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const qty   = Number(quantity);
  const uCost = unitCost ? Number(unitCost) : Number(item.costPrice);

  await prisma.$transaction([
    prisma.inventoryStock.upsert({
      where: { itemId_locationId: { itemId, locationId } },
      create: { itemId, locationId, quantity: qty },
      update: { quantity: { increment: qty } },
    }),
    prisma.inventoryTransaction.create({
      data: { itemId, locationId, type: 'PURCHASE', quantity: qty,
        unitCost: uCost, totalCost: qty * uCost,
        note: note || null, date: date ? new Date(date) : new Date() },
    }),
  ]);

  const stock = await prisma.inventoryStock.findUnique({ where: { itemId_locationId: { itemId, locationId } } });
  res.status(201).json(stock);
};

// POST /inventory/adjust — manual adjustment / wastage
const adjustStock = async (req, res) => {
  const { itemId, locationId, quantity, type, note } = req.body;
  if (!itemId || !locationId || quantity === undefined || !type)
    return res.status(400).json({ error: 'itemId, locationId, quantity, type required' });
  if (!['ADJUSTMENT', 'WASTAGE'].includes(type))
    return res.status(400).json({ error: 'type must be ADJUSTMENT or WASTAGE' });

  const qty = Number(quantity); // can be negative for wastage

  await prisma.$transaction([
    prisma.inventoryStock.upsert({
      where: { itemId_locationId: { itemId, locationId } },
      create: { itemId, locationId, quantity: qty },
      update: { quantity: { increment: qty } },
    }),
    prisma.inventoryTransaction.create({
      data: { itemId, locationId, type, quantity: qty, note: note || null },
    }),
  ]);

  res.json({ ok: true });
};

// POST /inventory/transfer — inter-location transfer
const transferStock = async (req, res) => {
  const { itemId, fromLocationId, toLocationId, quantity, note } = req.body;
  if (!itemId || !fromLocationId || !toLocationId || !quantity)
    return res.status(400).json({ error: 'itemId, fromLocationId, toLocationId, quantity required' });
  if (fromLocationId === toLocationId)
    return res.status(400).json({ error: 'Cannot transfer to same location' });

  const qty = Number(quantity);

  const transfer = await prisma.$transaction(async (tx) => {
    const xfer = await tx.inventoryTransfer.create({
      data: { itemId, fromLocationId, toLocationId, quantity: qty, note: note || null },
    });
    await tx.inventoryStock.upsert({
      where: { itemId_locationId: { itemId, locationId: fromLocationId } },
      create: { itemId, locationId: fromLocationId, quantity: -qty },
      update: { quantity: { decrement: qty } },
    });
    await tx.inventoryStock.upsert({
      where: { itemId_locationId: { itemId, locationId: toLocationId } },
      create: { itemId, locationId: toLocationId, quantity: qty },
      update: { quantity: { increment: qty } },
    });
    await tx.inventoryTransaction.createMany({
      data: [
        { itemId, locationId: fromLocationId, type: 'TRANSFER_OUT', quantity: -qty, transferId: xfer.id, note: note || null },
        { itemId, locationId: toLocationId,   type: 'TRANSFER_IN',  quantity:  qty, transferId: xfer.id, note: note || null },
      ],
    });
    return xfer;
  });

  res.status(201).json(transfer);
};

// GET /inventory/transactions — ledger for an item
const getTransactions = async (req, res) => {
  const { itemId, locationId } = req.query;
  const txns = await prisma.inventoryTransaction.findMany({
    where: {
      ...(itemId     && { itemId }),
      ...(locationId && { locationId }),
      item: { businessId: req.businessId },
    },
    include: { item: { select: { name: true, unit: true } }, location: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(txns);
};

module.exports = { listItems, createItem, updateItem, addStock, adjustStock, transferStock, getTransactions };
