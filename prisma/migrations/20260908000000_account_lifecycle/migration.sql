-- FID-0007: persistent onboarding, manual subscription lifecycle and account closure.
-- Expand-only: all new columns are nullable/defaulted and all new tables are isolated
-- from the existing customer ledger until the application opts into them.
DO $$ BEGIN CREATE TYPE "OnboardingStep" AS ENUM ('INTRO', 'BUSINESS', 'CARD', 'ACQUISITION', 'PAYWALL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OnboardingStatus" AS ENUM ('IN_PROGRESS', 'AWAITING_PAYMENT', 'ACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionPlan" AS ENUM ('LITE', 'PRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ClosureStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CleanupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "LoyaltyCard" ADD COLUMN IF NOT EXISTS "isLite" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "BusinessCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessCategory_name_key" ON "BusinessCategory"("name");

CREATE TABLE IF NOT EXISTS "OnboardingProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT,
  "firstCardId" TEXT,
  "step" "OnboardingStep" NOT NULL DEFAULT 'INTRO',
  "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "draftVersion" INTEGER NOT NULL DEFAULT 0,
  "businessDraft" JSONB,
  "cardDraft" JSONB,
  "acquisitionSource" TEXT,
  "selectedBillingInterval" "BillingInterval",
  "introSkippedAt" TIMESTAMP(3),
  "acquisitionSkippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");
CREATE INDEX IF NOT EXISTS "OnboardingProgress_businessId_status_idx" ON "OnboardingProgress"("businessId", "status");

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'LITE',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "amountMinor" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "proTrialEndsAt" TIMESTAMP(3),
  "externalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Subscription_businessId_status_idx" ON "Subscription"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_periodEnd_idx" ON "Subscription"("periodEnd");

CREATE TABLE IF NOT EXISTS "CustomerProfile" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "authUserId" UUID,
  "email" TEXT NOT NULL,
  "emailKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatarPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_businessId_emailKey_key" ON "CustomerProfile"("businessId", "emailKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_businessId_authUserId_key" ON "CustomerProfile"("businessId", "authUserId");
CREATE INDEX IF NOT EXISTS "CustomerProfile_emailKey_idx" ON "CustomerProfile"("emailKey");

CREATE TABLE IF NOT EXISTS "BusinessAvatarAsset" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "status" "CleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessAvatarAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessAvatarAsset_storagePath_key" ON "BusinessAvatarAsset"("storagePath");
CREATE INDEX IF NOT EXISTS "BusinessAvatarAsset_businessId_status_idx" ON "BusinessAvatarAsset"("businessId", "status");

CREATE TABLE IF NOT EXISTS "AccountClosure" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "status" "ClosureStatus" NOT NULL DEFAULT 'SCHEDULED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "canceledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountClosure_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AccountClosure_businessId_status_idx" ON "AccountClosure"("businessId", "status");
CREATE INDEX IF NOT EXISTS "AccountClosure_scheduledFor_status_idx" ON "AccountClosure"("scheduledFor", "status");

DO $$ BEGIN
  ALTER TABLE "Business" ADD CONSTRAINT "Business_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_firstCardId_fkey" FOREIGN KEY ("firstCardId") REFERENCES "LoyaltyCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "BusinessAvatarAsset" ADD CONSTRAINT "BusinessAvatarAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "AccountClosure" ADD CONSTRAINT "AccountClosure_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
