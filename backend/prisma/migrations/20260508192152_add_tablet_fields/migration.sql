-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'qr';

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "tabletPin" TEXT;
