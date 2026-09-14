ALTER TYPE "ClosureStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "ClosureStatus" ADD VALUE IF NOT EXISTS 'FAILED';
CREATE TYPE "ClosureCleanupKind" AS ENUM ('BUSINESS_AVATAR', 'AUTH_USER');
CREATE TYPE "ClosureExecutionStatus" AS ENUM ('PROCESSING', 'FAILED', 'COMPLETED');

ALTER TABLE "TeamInvitation" ADD COLUMN IF NOT EXISTS "authUserId" UUID;

CREATE TABLE "AccountClosureExecution" (
  "id" TEXT NOT NULL,
  "closureId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "status" "ClosureExecutionStatus" NOT NULL DEFAULT 'PROCESSING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountClosureExecution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountClosureExecution_closureId_key" ON "AccountClosureExecution"("closureId");
CREATE INDEX "AccountClosureExecution_businessId_status_idx" ON "AccountClosureExecution"("businessId", "status");

CREATE TABLE "AccountClosureCleanupTask" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "kind" "ClosureCleanupKind" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "bucket" TEXT,
  "storagePath" TEXT,
  "status" "CleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountClosureCleanupTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountClosureCleanupTask_executionId_kind_subjectId_key" ON "AccountClosureCleanupTask"("executionId", "kind", "subjectId");
CREATE INDEX "AccountClosureCleanupTask_executionId_status_idx" ON "AccountClosureCleanupTask"("executionId", "status");
ALTER TABLE "AccountClosureCleanupTask" ADD CONSTRAINT "AccountClosureCleanupTask_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AccountClosureExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountClosureExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountClosureCleanupTask" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AccountClosureExecution" FROM anon, authenticated;
REVOKE ALL ON TABLE "AccountClosureCleanupTask" FROM anon, authenticated;
