-- FID-0007 follow-up: protect lifecycle tables and serialize active subscriptions.
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_one_active_business_key" ON "Subscription"("businessId") WHERE "status" = 'ACTIVE';
ALTER TABLE "BusinessCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessAvatarAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountClosure" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessCategory" FROM anon, authenticated;
REVOKE ALL ON TABLE "OnboardingProgress" FROM anon, authenticated;
REVOKE ALL ON TABLE "Subscription" FROM anon, authenticated;
REVOKE ALL ON TABLE "CustomerProfile" FROM anon, authenticated;
REVOKE ALL ON TABLE "BusinessAvatarAsset" FROM anon, authenticated;
REVOKE ALL ON TABLE "AccountClosure" FROM anon, authenticated;
