-- FID-0007: global customer identity, explicit card states and manual billing audit.
CREATE TYPE "CardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED_BY_PLAN', 'ARCHIVED');
CREATE TYPE "ThemePlan" AS ENUM ('LITE', 'PRO');

ALTER TABLE "CustomerProfile" DROP CONSTRAINT IF EXISTS "CustomerProfile_businessId_fkey";
DROP INDEX IF EXISTS "CustomerProfile_businessId_authUserId_key";
DROP INDEX IF EXISTS "CustomerProfile_businessId_emailKey_key";
DROP INDEX IF EXISTS "CustomerProfile_emailKey_idx";

ALTER TABLE "Customer" ADD COLUMN "profileId" TEXT;
ALTER TABLE "CustomerProfile" ADD COLUMN "emailNormalized" TEXT;
UPDATE "CustomerProfile" SET "emailNormalized" = lower(trim("email"));
ALTER TABLE "CustomerProfile" DROP COLUMN "businessId", DROP COLUMN "email", DROP COLUMN "emailKey";
ALTER TABLE "CustomerProfile" ADD COLUMN "avatarRingColor" TEXT NOT NULL DEFAULT '#ff6b35';
ALTER TABLE "CustomerProfile" ALTER COLUMN "emailNormalized" SET NOT NULL;

ALTER TABLE "LoyaltyCard" ADD COLUMN "effectiveThemeId" TEXT;
ALTER TABLE "LoyaltyCard" ADD COLUMN "selectedThemeId" TEXT;
ALTER TABLE "LoyaltyCard" ADD COLUMN "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "LoyaltyCard" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"CardStatus" ELSE 'ARCHIVED'::"CardStatus" END;

ALTER TABLE "Subscription" ADD COLUMN "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MXN';
ALTER TABLE "Subscription" ADD COLUMN "liteCardId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "proAccessGranted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "businessId" DROP NOT NULL;

CREATE TABLE "BillingAuditEvent" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "action" TEXT NOT NULL, "operator" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "externalReference" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BillingAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoyaltyTheme" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "plan" "ThemePlan" NOT NULL DEFAULT 'LITE',
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LoyaltyTheme_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AvatarCleanupJob" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "bucket" TEXT NOT NULL, "storagePath" TEXT NOT NULL,
  "status" "CleanupStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT, "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AvatarCleanupJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingAuditEvent_idempotencyKey_key" ON "BillingAuditEvent"("idempotencyKey");
CREATE INDEX "BillingAuditEvent_businessId_createdAt_idx" ON "BillingAuditEvent"("businessId", "createdAt");
CREATE UNIQUE INDEX "LoyaltyTheme_code_key" ON "LoyaltyTheme"("code");
CREATE INDEX "AvatarCleanupJob_status_createdAt_idx" ON "AvatarCleanupJob"("status", "createdAt");
CREATE INDEX "AvatarCleanupJob_profileId_status_idx" ON "AvatarCleanupJob"("profileId", "status");
CREATE UNIQUE INDEX "Customer_cardId_profileId_key" ON "Customer"("cardId", "profileId");
CREATE UNIQUE INDEX "CustomerProfile_authUserId_key" ON "CustomerProfile"("authUserId");
CREATE UNIQUE INDEX "CustomerProfile_emailNormalized_key" ON "CustomerProfile"("emailNormalized");

ALTER TABLE "BillingAuditEvent" ADD CONSTRAINT "BillingAuditEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvatarCleanupJob" ADD CONSTRAINT "AvatarCleanupJob_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_selectedThemeId_fkey" FOREIGN KEY ("selectedThemeId") REFERENCES "LoyaltyTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_effectiveThemeId_fkey" FOREIGN KEY ("effectiveThemeId") REFERENCES "LoyaltyTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- These tables are not public Data API surfaces; keep them protected by default.
ALTER TABLE "CustomerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvatarCleanupJob" ENABLE ROW LEVEL SECURITY;
