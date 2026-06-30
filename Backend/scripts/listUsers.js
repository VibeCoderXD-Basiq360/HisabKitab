const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, name: true, email: true } })
  .then(users => { console.log(JSON.stringify(users, null, 2)); p.$disconnect(); });
