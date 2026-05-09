-- Add Table.tableCode with safe backfill before applying NOT NULL + UNIQUE
ALTER TABLE "Table" ADD COLUMN "tableCode" TEXT;

UPDATE "Table"
SET "tableCode" = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE "tableCode" IS NULL;

ALTER TABLE "Table" ALTER COLUMN "tableCode" SET NOT NULL;
ALTER TABLE "Table" ALTER COLUMN "tableCode" SET DEFAULT '';
CREATE UNIQUE INDEX "Table_tableCode_key" ON "Table"("tableCode");

-- Allow OrderItem to reference either a Product or a Combo
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "comboId" INTEGER;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_comboId_fkey"
  FOREIGN KEY ("comboId") REFERENCES "Combo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
