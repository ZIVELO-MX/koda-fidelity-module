-- AlterTable: add iconName to Business
ALTER TABLE "Business" ADD COLUMN "iconName" TEXT;

-- AlterTable: add iconName to LoyaltyCard
ALTER TABLE "LoyaltyCard" ADD COLUMN "iconName" TEXT;

-- AlterTable: add isActive to Customer (default true so existing rows stay active)
ALTER TABLE "Customer" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
