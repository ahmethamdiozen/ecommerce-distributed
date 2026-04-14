-- AlterTable: drop unique on orderId, add plain index (one order can have many items)
ALTER TABLE "order_events" DROP CONSTRAINT IF EXISTS "order_events_orderId_key";
DROP INDEX IF EXISTS "order_events_orderId_key";
CREATE INDEX IF NOT EXISTS "order_events_orderId_idx" ON "order_events"("orderId");

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
