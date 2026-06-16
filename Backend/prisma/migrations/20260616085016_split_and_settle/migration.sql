-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('PENDING', 'PAYMENT_REQUESTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "email" TEXT,
ADD COLUMN     "linkedUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcmToken" TEXT;

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SplitStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "note" TEXT,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseSplit_expenseId_idx" ON "ExpenseSplit"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_personId_idx" ON "ExpenseSplit"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_personId_key" ON "ExpenseSplit"("expenseId", "personId");

-- CreateIndex
CREATE INDEX "PaymentRequest_splitId_idx" ON "PaymentRequest"("splitId");

-- CreateIndex
CREATE INDEX "Person_linkedUserId_idx" ON "Person"("linkedUserId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "ExpenseSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
