const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { name: true, email: true, authProvider: true } }).then(users => {
  console.log(JSON.stringify(users, null, 2));
  p.$disconnect();
});
