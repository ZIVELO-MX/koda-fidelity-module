-- FID-0006: timezone-aware dashboard contracts and bounded ledger queries.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City';
CREATE INDEX IF NOT EXISTS "StampLog_businessId_type_createdAt_idx" ON "StampLog"("businessId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "StampLog_businessId_cardId_createdAt_id_idx" ON "StampLog"("businessId", "cardId", "createdAt", "id");
