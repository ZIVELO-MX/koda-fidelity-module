-- FID-0005: versioned loyalty cycles, idempotency and immutable ledger metadata.
DO $$ BEGIN
  CREATE TYPE "LedgerEventType" AS ENUM ('customer_joined', 'stamp', 'milestone', 'completion', 'redeem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "LoyaltyOperationType" AS ENUM ('stamp', 'redeem');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
ALTER TABLE "StampLog" ALTER COLUMN "type" TYPE "LedgerEventType" USING CASE
  WHEN "type" IN ('customer_joined', 'stamp', 'milestone', 'completion', 'redeem') THEN "type"::"LedgerEventType"
  ELSE 'stamp'::"LedgerEventType"
END;
ALTER TABLE "LoyaltyOperation" ALTER COLUMN "type" TYPE "LoyaltyOperationType" USING CASE
  WHEN "type" = 'redeem' THEN 'redeem'::"LoyaltyOperationType"
  ELSE 'stamp'::"LoyaltyOperationType"
END;

CREATE UNIQUE INDEX IF NOT EXISTS "CardConfiguration_cardId_version_key" ON "CardConfiguration"("cardId", "version");
CREATE INDEX IF NOT EXISTS "CardConfiguration_cardId_createdAt_idx" ON "CardConfiguration"("cardId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyCycle_customerId_createdAt_idx" ON "LoyaltyCycle"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyCycle_cardId_createdAt_idx" ON "LoyaltyCycle"("cardId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyOperation_businessId_idempotencyKey_key" ON "LoyaltyOperation"("businessId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "LoyaltyOperation_customerId_createdAt_idx" ON "LoyaltyOperation"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Customer_currentCycleId_idx" ON "Customer"("currentCycleId");
CREATE INDEX IF NOT EXISTS "Customer_cardId_isActive_idx" ON "Customer"("cardId", "isActive");
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
CREATE INDEX IF NOT EXISTS "LoyaltyCard_businessId_idx" ON "LoyaltyCard"("businessId");
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

DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_stamps_nonnegative" CHECK ("stamps" >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_stampsRequired_range" CHECK ("stampsRequired" BETWEEN 1 AND 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MilestoneReward" ADD CONSTRAINT "MilestoneReward_probability_range" CHECK ("probability" BETWEEN 0 AND 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LoyaltyCycle" ADD CONSTRAINT "LoyaltyCycle_balance_nonnegative" CHECK ("balance" >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "CustomerMilestoneClaim" DROP CONSTRAINT IF EXISTS "CustomerMilestoneClaim_customerId_fkey";
ALTER TABLE "CustomerMilestoneClaim" DROP CONSTRAINT IF EXISTS "CustomerMilestoneClaim_milestoneId_fkey";
ALTER TABLE "CustomerMilestoneClaim" ADD CONSTRAINT "CustomerMilestoneClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerMilestoneClaim" ADD CONSTRAINT "CustomerMilestoneClaim_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_stamp_log_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'StampLog is immutable';
END;
$$;
DROP TRIGGER IF EXISTS "StampLog_immutable" ON "StampLog";
CREATE TRIGGER "StampLog_immutable"
  BEFORE UPDATE ON "StampLog"
  FOR EACH ROW EXECUTE FUNCTION "prevent_stamp_log_mutation"();
