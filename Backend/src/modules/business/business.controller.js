const prisma = require('../../lib/prisma');
const notify = require('../../lib/notify');

// GET /api/business — get my business (or null)
const getMyBusiness = async (req, res) => {
  const partner = await prisma.businessPartner.findFirst({
    where: { userId: req.user.userId, status: 'ACTIVE' },
    include: {
      business: {
        include: {
          settings: true,
          locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
          partners: { where: { status: 'ACTIVE' }, include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } } },
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
      partners: { create: { userId: req.user.userId, role: 'OWNER', status: 'ACTIVE', equityPct: 100, profitSharePct: 100 } },
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
  if (already) {
    if (already.status === 'DECLINED') {
      await prisma.businessPartner.update({ where: { id: already.id }, data: { status: 'PENDING' } });
      return res.json({ ...already, status: 'PENDING' });
    }
    return res.status(400).json({ error: already.status === 'PENDING' ? 'Invite already sent' : 'Already a partner' });
  }

  const partner = await prisma.businessPartner.create({
    data: {
      businessId: req.businessId,
      userId: targetUser.id,
      role: 'PARTNER',
      status: 'PENDING',
      equityPct: equityPct ?? 50,
      profitSharePct: profitSharePct ?? 50,
    },
    include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
  });

  await notify(targetUser.id, targetUser.fcmToken, {
    title: '🏭 Business Invite',
    body: `${req.user.name || req.user.email} invited you to join ${req.business.name}`,
    data: { type: 'BUSINESS_PARTNER_INVITE', partnerId: partner.id },
  });

  res.status(201).json(partner);
};

// GET /api/business/partners/invites — auth-only, pending invites for current user
const listInvites = async (req, res) => {
  const invites = await prisma.businessPartner.findMany({
    where: { userId: req.user.userId, status: 'PENDING' },
    include: {
      business: {
        select: { id: true, name: true, tagline: true },
        include: { partners: { where: { role: 'OWNER', status: 'ACTIVE' }, include: { user: { select: { id: true, name: true, email: true } } }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invites);
};

// POST /api/business/partners/:id/accept
const acceptInvite = async (req, res) => {
  const invite = await prisma.businessPartner.findFirst({
    where: { id: req.params.id, userId: req.user.userId, status: 'PENDING' },
    include: { business: { include: { partners: { where: { role: 'OWNER', status: 'ACTIVE' }, include: { user: { select: { id: true, fcmToken: true, name: true, email: true } } } } } } },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  const updated = await prisma.businessPartner.update({
    where: { id: invite.id },
    data: { status: 'ACTIVE' },
  });

  const owner = invite.business.partners[0]?.user;
  if (owner) {
    await notify(owner.id, owner.fcmToken, {
      title: '✅ Partner Joined',
      body: `${req.user.name || req.user.email} accepted your invite to ${invite.business.name}`,
      data: { type: 'BUSINESS_PARTNER_ACCEPTED', businessId: invite.businessId },
    });
  }

  res.json(updated);
};

// POST /api/business/partners/:id/decline
const declineInvite = async (req, res) => {
  const invite = await prisma.businessPartner.findFirst({
    where: { id: req.params.id, userId: req.user.userId, status: 'PENDING' },
    include: { business: { include: { partners: { where: { role: 'OWNER', status: 'ACTIVE' }, include: { user: { select: { id: true, fcmToken: true, name: true, email: true } } } } } } },
  });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });

  await prisma.businessPartner.update({ where: { id: invite.id }, data: { status: 'DECLINED' } });

  const owner = invite.business.partners[0]?.user;
  if (owner) {
    await notify(owner.id, owner.fcmToken, {
      title: '❌ Invite Declined',
      body: `${req.user.name || req.user.email} declined the invite to ${invite.business.name}`,
      data: { type: 'BUSINESS_PARTNER_DECLINED', businessId: invite.businessId },
    });
  }

  res.json({ ok: true });
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

module.exports = { getMyBusiness, createBusiness, updateSettings, addLocation, invitePartner, listInvites, acceptInvite, declineInvite, updatePartner };
