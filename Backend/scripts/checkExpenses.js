require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const expenses = await prisma.expense.findMany({
    where: { userId: 'cmpzt4ki6000030h7fsnw5xpj' },
    select: { title: true, expenseDate: true, amount: true, paymentTypeId: true },
    orderBy: { expenseDate: 'desc' },
    take: 10,
  });

  console.log(`Total recent expenses: ${expenses.length}`);
  expenses.forEach(e => {
    console.log(`  ${e.expenseDate.toISOString().slice(0,10)}  ₹${e.amount}  ${e.title}  paymentTypeId=${e.paymentTypeId}`);
  });

  const nullPayment = await prisma.expense.count({
    where: { userId: 'cmpzt4ki6000030h7fsnw5xpj', paymentTypeId: null }
  });
  console.log(`\nExpenses with null paymentTypeId: ${nullPayment}`);

  const total = await prisma.expense.count({ where: { userId: 'cmpzt4ki6000030h7fsnw5xpj' } });
  console.log(`Total expenses for Aditya: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
