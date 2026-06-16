const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(n => {
  console.log(n);
  p.$disconnect();
});
