CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL,
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionRequest_ticketNumber_key" ON "SubscriptionRequest"("ticketNumber");
CREATE UNIQUE INDEX "SubscriptionRequest_one_pending_business_key" ON "SubscriptionRequest"("businessId") WHERE "status" = 'PENDING';
CREATE INDEX "SubscriptionRequest_businessId_createdAt_idx" ON "SubscriptionRequest"("businessId", "createdAt");
CREATE INDEX "SubscriptionRequest_requestedByUserId_idx" ON "SubscriptionRequest"("requestedByUserId");

ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SubscriptionRequest" FROM anon, authenticated;
