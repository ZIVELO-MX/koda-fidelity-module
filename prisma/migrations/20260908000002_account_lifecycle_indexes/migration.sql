-- FID-0007 follow-up: index the optional business category lookup.
CREATE INDEX IF NOT EXISTS "Business_categoryId_idx" ON "Business"("categoryId");
