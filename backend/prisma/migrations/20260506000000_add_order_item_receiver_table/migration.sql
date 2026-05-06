-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "receiverTableId" INTEGER;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_receiverTableId_fkey" FOREIGN KEY ("receiverTableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
