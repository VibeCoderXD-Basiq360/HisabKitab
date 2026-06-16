-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paidForPersonId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_userId_paidForPersonId_idx" ON "Expense"("userId", "paidForPersonId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidForPersonId_fkey" FOREIGN KEY ("paidForPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
