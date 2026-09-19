-- FID-0026: real Pro finishes and finite Lite trial grants.
INSERT INTO "LoyaltyTheme" ("id", "code", "plan", "isActive", "createdAt", "updatedAt")
VALUES
  ('theme-gradiente', 'gradiente', 'PRO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-foil', 'foil', 'PRO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-cinetico', 'cinetico', 'PRO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-vidrio', 'vidrio', 'PRO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "plan" = EXCLUDED."plan",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Subscription"
SET
  "proTrialEndsAt" = "activatedAt" + INTERVAL '1 month',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "status" = 'ACTIVE'
  AND "plan" = 'LITE'
  AND "proAccessGranted" = true
  AND "proTrialEndsAt" IS NULL;
