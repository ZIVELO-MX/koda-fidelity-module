CREATE TYPE "CardTextColor" AS ENUM ('AUTO', 'DARK', 'LIGHT');

ALTER TABLE "LoyaltyCard"
ADD COLUMN "textColor" "CardTextColor" NOT NULL DEFAULT 'AUTO';
