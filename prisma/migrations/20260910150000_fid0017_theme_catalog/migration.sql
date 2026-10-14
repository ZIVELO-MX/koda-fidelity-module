-- FID-0017: canonical card theme catalog for the Rulaxx contract.
INSERT INTO "LoyaltyTheme" ("id", "code", "plan", "isActive", "createdAt", "updatedAt")
VALUES
  ('theme-panaderia', 'panaderia', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-taqueria', 'taqueria', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-cafeteria', 'cafeteria', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-hamburguesas', 'hamburguesas', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-pizzeria', 'pizzeria', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-barberia', 'barberia', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-salon-belleza', 'salon-belleza', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-gimnasio', 'gimnasio', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-futbol', 'futbol', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-sushi', 'sushi', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-veterinaria', 'veterinaria', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-farmacia', 'farmacia', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme-heladeria', 'heladeria', 'LITE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;
