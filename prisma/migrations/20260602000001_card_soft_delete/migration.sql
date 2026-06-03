-- AlterTable: add isActive to LoyaltyCard (default true so existing cards stay active)
ALTER TABLE "LoyaltyCard" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
