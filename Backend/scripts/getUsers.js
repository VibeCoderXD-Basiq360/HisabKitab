require('dotenv').config();
const prisma = require('../src/lib/prisma');
prisma.user.findMany({
  where: { email: { in: ['demo1@hisabkitab.app', 'demo2@hisabkitab.app', 'adityaarora0601@gmail.com'] } },
  select: { id: true, email: true, name: true }
}).then(users => {
  users.forEach(u => console.log(u.id, '|', u.email, '|', u.name));
  prisma.$disconnect();
});
