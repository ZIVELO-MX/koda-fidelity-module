-- Create MilestoneReward table
CREATE TABLE "MilestoneReward" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cardId" TEXT NOT NULL REFERENCES "LoyaltyCard"(id) ON DELETE CASCADE,
    "stampNumber" INTEGER NOT NULL,
    label TEXT NOT NULL,
    "iconName" TEXT,
    probability INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("cardId", "stampNumber")
);

CREATE INDEX idx_milestone_reward_card_id ON "MilestoneReward"("cardId");

-- Create CustomerMilestoneClaim table
CREATE TABLE "CustomerMilestoneClaim" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "customerId" TEXT NOT NULL REFERENCES "Customer"(id),
    "milestoneId" TEXT NOT NULL REFERENCES "MilestoneReward"(id),
    "cardId" TEXT NOT NULL,
    label TEXT NOT NULL,
    "iconName" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_milestone_claim_customer ON "CustomerMilestoneClaim"("customerId");
CREATE INDEX idx_customer_milestone_claim_milestone ON "CustomerMilestoneClaim"("milestoneId");
CREATE INDEX idx_customer_milestone_claim_card ON "CustomerMilestoneClaim"("cardId");

-- Add metadata column to StampLog
ALTER TABLE "StampLog" ADD COLUMN IF NOT EXISTS metadata JSONB;
