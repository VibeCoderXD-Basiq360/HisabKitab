const prisma = require('../../lib/prisma');

// GET /api/business — get my business (or null)
const getMyBusiness = async (req, res) => {
  const partner = await prisma.businessPartner.findFirst({
    where: { userId: req.user.userId },
    include: {
      business: {
        include: {
          settings: true,
          locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
          partners: { include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } } },
        },
      },
    },
  });
  res.json(partner ? { ...partner.business, myRole: partner.role } : null);
};

// POST /api/business — create business (first-time setup)
const createBusiness = async (req, res) => {
  const existing = await prisma.businessPartner.findFirst({ where: { userId: req.user.userId } });
  if (existing) return res.status(400).json({ error: 'Already in a business' });

  const { name, tagline, locations = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      tagline: tagline?.trim() || null,
      settings: { create: {} },
      partners: { create: { userId: req.user.userId, role: 'OWNER', equityPct: 100, profitSharePct: 100 } },
      locations: { create: (locations.length ? locations : [{ name: 'Main' }]).map(l => ({ name: l.name, address: l.address || null })) },
    },
    include: { settings: true, locations: true, partners: true },
  });
  res.status(201).json(business);
};

// PUT /api/business/settings
const updateSettings = async (req, res) => {
  const { printerCostRs, printerLifeHr, printerPowerW, electricityRateKwh,
    defaultLabourRateHr, labourOnByDefault, defaultFailureRatePct, defaultTargetMarginPct, defaultPaymentFeePct } = req.body;

  const settings = await prisma.businessSettings.update({
    where: { businessId: req.businessId },
    data: {
      ...(printerCostRs          !== undefined && { printerCostRs: Number(printerCostRs) }),
      ...(printerLifeHr          !== undefined && { printerLifeHr: Number(printerLifeHr) }),
      ...(printerPowerW          !== undefined && { printerPowerW: Number(printerPowerW) }),
      ...(electricityRateKwh     !== undefined && { electricityRateKwh: Number(electricityRateKwh) }),
      ...(defaultLabourRateHr    !== undefined && { defaultLabourRateHr: Number(defaultLabourRateHr) }),
      ...(labourOnByDefault      !== undefined && { labourOnByDefault: Boolean(labourOnByDefault) }),
      ...(defaultFailureRatePct  !== undefined && { defaultFailureRatePct: Number(defaultFailureRatePct) }),
      ...(defaultTargetMarginPct !== undefined && { defaultTargetMarginPct: Number(defaultTargetMarginPct) }),
      ...(defaultPaymentFeePct   !== undefined && { defaultPaymentFeePct: Number(defaultPaymentFeePct) }),
    },
  });
  res.json(settings);
};

// POST /api/business/locations
const addLocation = async (req, res) => {
  const { name, address } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const loc = await prisma.businessLocation.create({
    data: { businessId: req.businessId, name: name.trim(), address: address?.trim() || null },
  });
  res.status(201).json(loc);
};

// POST /api/business/partners/invite
const invitePartner = async (req, res) => {
  if (req.partner.role !== 'OWNER') return res.status(403).json({ error: 'Owner only' });
  const { email, equityPct, profitSharePct } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return res.status(404).json({ error: 'No HisabKitab account with that email' });

  const already = await prisma.businessPartner.findUnique({
    where: { businessId_userId: { businessId: req.businessId, userId: targetUser.id } },
  });
  if (already) return res.status(400).json({ error: 'Already a partner' });

  const partner = await prisma.businessPartner.create({
    data: {
      businessId: req.businessId,
      userId: targetUser.id,
      role: 'PARTNER',
      equityPct: equityPct ?? 50,
      profitSharePct: profitSharePct ?? 50,
    },
    include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
  });
  res.status(201).json(partner);
};

// PUT /api/business/partners/:partnerId
const updatePartner = async (req, res) => {
  if (req.partner.role !== 'OWNER') return res.status(403).json({ error: 'Owner only' });
  const { equityPct, profitSharePct } = req.body;
  const p = await prisma.businessPartner.update({
    where: { id: req.params.partnerId },
    data: { equityPct: equityPct ?? undefined, profitSharePct: profitSharePct ?? undefined },
  });
  res.json(p);
};

module.exports = { getMyBusiness, createBusiness, updateSettings, addLocation, invitePartner, updatePartner };
