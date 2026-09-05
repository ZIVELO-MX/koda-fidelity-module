-- FID-0005: versioned loyalty cycles, idempotency and immutable ledger metadata.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "currentCycleId" TEXT;

CREATE TABLE IF NOT EXISTS "CardConfiguration" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "stampsRequired" INTEGER NOT NULL,
  "reward" TEXT NOT NULL,
  "milestones" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoyaltyCycle" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoyaltyOperation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "cycleId" TEXT,
  "type" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyOperation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS "cardId" TEXT;
ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;
ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER;
ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS "stampsRequiredSnapshot" INTEGER;
ALTER TABLE "StampLog" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "StampLog" DROP CONSTRAINT IF EXISTS "StampLog_customerId_fkey";

CREATE UNIQUE INDEX IF NOT EXISTS "CardConfiguration_cardId_version_key" ON "CardConfiguration"("cardId", "version");
CREATE INDEX IF NOT EXISTS "CardConfiguration_cardId_createdAt_idx" ON "CardConfiguration"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyCycle_customerId_createdAt_idx" ON "LoyaltyCycle"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyCycle_cardId_createdAt_idx" ON "LoyaltyCycle"("cardId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyOperation_businessId_idempotencyKey_key" ON "LoyaltyOperation"("businessId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "LoyaltyOperation_customerId_createdAt_idx" ON "LoyaltyOperation"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Customer_currentCycleId_idx" ON "Customer"("currentCycleId");
CREATE INDEX IF NOT EXISTS "StampLog_businessId_createdAt_idx" ON "StampLog"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "StampLog_cardId_type_createdAt_idx" ON "StampLog"("cardId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "StampLog_customerId_type_createdAt_idx" ON "StampLog"("customerId", "type", "createdAt");

DO $$ BEGIN
  ALTER TABLE "CardConfiguration" ADD CONSTRAINT "CardConfiguration_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoyaltyCycle" ADD CONSTRAINT "LoyaltyCycle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "LoyaltyCycle" ADD CONSTRAINT "LoyaltyCycle_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "LoyaltyCycle" ADD CONSTRAINT "LoyaltyCycle_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "CardConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoyaltyOperation" ADD CONSTRAINT "LoyaltyOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "LoyaltyOperation" ADD CONSTRAINT "LoyaltyOperation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "LoyaltyOperation" ADD CONSTRAINT "LoyaltyOperation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "LoyaltyOperation" ADD CONSTRAINT "LoyaltyOperation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "LoyaltyCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StampLog" ADD CONSTRAINT "StampLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "StampLog" ADD CONSTRAINT "StampLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  ALTER TABLE "StampLog" ADD CONSTRAINT "StampLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  ALTER TABLE "StampLog" ADD CONSTRAINT "StampLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "LoyaltyCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_currentCycleId_fkey" FOREIGN KEY ("currentCycleId") REFERENCES "LoyaltyCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
