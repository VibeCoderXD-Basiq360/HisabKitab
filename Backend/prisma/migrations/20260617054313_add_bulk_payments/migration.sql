-- CreateEnum
CREATE TYPE "BulkPaymentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BulkPayment" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "status" "BulkPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkPaymentSplit" (
    "bulkPaymentId" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,

    CONSTRAINT "BulkPaymentSplit_pkey" PRIMARY KEY ("bulkPaymentId","splitId")
);

-- CreateIndex
CREATE INDEX "BulkPayment_fromUserId_status_idx" ON "BulkPayment"("fromUserId", "status");

-- CreateIndex
CREATE INDEX "BulkPayment_toUserId_status_idx" ON "BulkPayment"("toUserId", "status");

-- CreateIndex
CREATE INDEX "BulkPaymentSplit_splitId_idx" ON "BulkPaymentSplit"("splitId");

-- AddForeignKey
ALTER TABLE "BulkPayment" ADD CONSTRAINT "BulkPayment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkPayment" ADD CONSTRAINT "BulkPayment_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkPaymentSplit" ADD CONSTRAINT "BulkPaymentSplit_bulkPaymentId_fkey" FOREIGN KEY ("bulkPaymentId") REFERENCES "BulkPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkPaymentSplit" ADD CONSTRAINT "BulkPaymentSplit_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "ExpenseSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
