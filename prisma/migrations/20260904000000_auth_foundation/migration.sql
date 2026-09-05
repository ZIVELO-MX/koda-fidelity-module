-- Expand-only migration. Safe for the shared main/dev database.
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('admin', 'sellador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'admin',
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authUserId" UUID,
  "passwordSetupRequired" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authUserId" UUID;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetupRequired" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_authUserId_key" ON "User"("authUserId");
CREATE INDEX IF NOT EXISTS "User_businessId_idx" ON "User"("businessId");
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SignupIntent" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL,
  "authUserId" UUID, "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignupIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SignupIntent_email_key" ON "SignupIntent"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "SignupIntent_authUserId_key" ON "SignupIntent"("authUserId");

CREATE TABLE IF NOT EXISTS "TeamInvitation" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL, "role" "Role" NOT NULL,
  "tokenHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3),
  "businessId" TEXT NOT NULL, "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "TeamInvitation_businessId_status_idx" ON "TeamInvitation"("businessId", "status");
CREATE INDEX IF NOT EXISTS "TeamInvitation_email_status_idx" ON "TeamInvitation"("email", "status");
DO $$ BEGIN
  ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
  "id" TEXT NOT NULL, "scope" TEXT NOT NULL, "subjectHash" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthRateLimit_scope_subjectHash_windowStart_key" ON "AuthRateLimit"("scope", "subjectHash", "windowStart");
CREATE INDEX IF NOT EXISTS "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "stampIconName" TEXT;
ALTER TABLE "LoyaltyCard" ADD COLUMN IF NOT EXISTS "stampIconName" TEXT;

ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StampLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MilestoneReward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerMilestoneClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignupIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthRateLimit" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Business", "User", "LoyaltyCard", "Customer", "StampLog", "MilestoneReward", "CustomerMilestoneClaim", "SignupIntent", "TeamInvitation", "AuthRateLimit" FROM anon, authenticated;

-- Reconcile legacy hand-written milestone DDL with the Prisma model.
ALTER TABLE "MilestoneReward" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "MilestoneReward" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "CustomerMilestoneClaim" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "CustomerMilestoneClaim" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER INDEX IF EXISTS "idx_milestone_reward_card_id" RENAME TO "MilestoneReward_cardId_idx";
ALTER INDEX IF EXISTS "idx_customer_milestone_claim_customer" RENAME TO "CustomerMilestoneClaim_customerId_idx";
ALTER INDEX IF EXISTS "idx_customer_milestone_claim_milestone" RENAME TO "CustomerMilestoneClaim_milestoneId_idx";
ALTER INDEX IF EXISTS "idx_customer_milestone_claim_card" RENAME TO "CustomerMilestoneClaim_cardId_idx";
ALTER TABLE "MilestoneReward" DROP CONSTRAINT IF EXISTS "MilestoneReward_cardId_fkey";
ALTER TABLE "MilestoneReward" ADD CONSTRAINT "MilestoneReward_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerMilestoneClaim" DROP CONSTRAINT IF EXISTS "CustomerMilestoneClaim_customerId_fkey";
ALTER TABLE "CustomerMilestoneClaim" ADD CONSTRAINT "CustomerMilestoneClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerMilestoneClaim" DROP CONSTRAINT IF EXISTS "CustomerMilestoneClaim_milestoneId_fkey";
ALTER TABLE "CustomerMilestoneClaim" ADD CONSTRAINT "CustomerMilestoneClaim_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
