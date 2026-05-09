/*
  Warnings:

  - You are about to drop the column `receiverTableId` on the `OrderItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_receiverTableId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "receiverTableId",
ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false;
