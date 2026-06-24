const prisma = require('../lib/prisma');

module.exports = async function businessAuth(req, res, next) {
  const partner = await prisma.businessPartner.findFirst({
    where: { userId: req.user.userId },
    include: { business: { include: { settings: true, locations: true } } },
  });
  if (!partner) return res.status(403).json({ error: 'Not a business partner' });
  req.business   = partner.business;
  req.businessId = partner.businessId;
  req.partner    = partner;
  next();
};
