-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billClosedAt" TIMESTAMP(3);

-- Backfill: existing delivered/cancelled orders are considered already closed.
-- We use updatedAt as the closure time approximation so they are excluded
-- from the "active orders" view of each table going forward.
UPDATE "Order"
SET "billClosedAt" = "updatedAt"
WHERE "status" IN ('delivered', 'cancelled');

-- CreateIndex
CREATE INDEX "Order_tableId_billClosedAt_idx" ON "Order"("tableId", "billClosedAt");
