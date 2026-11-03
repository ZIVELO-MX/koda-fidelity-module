-- Keep earned surprise claims when the business removes their configuration.
ALTER TABLE "CustomerMilestoneClaim"
ADD COLUMN "stampNumberSnapshot" INTEGER;

UPDATE "CustomerMilestoneClaim" AS claim
SET "stampNumberSnapshot" = reward."stampNumber"
FROM "MilestoneReward" AS reward
WHERE claim."milestoneId" = reward."id";

ALTER TABLE "CustomerMilestoneClaim"
ALTER COLUMN "stampNumberSnapshot" SET NOT NULL;

ALTER TABLE "CustomerMilestoneClaim"
DROP CONSTRAINT IF EXISTS "CustomerMilestoneClaim_milestoneId_fkey";

ALTER TABLE "CustomerMilestoneClaim"
ALTER COLUMN "milestoneId" DROP NOT NULL;

ALTER TABLE "CustomerMilestoneClaim"
ADD CONSTRAINT "CustomerMilestoneClaim_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "MilestoneReward"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
