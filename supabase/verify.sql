-- ================================================================
-- TurboNest Schema Verification Queries
-- Run this AFTER schema.sql has been executed successfully
-- ================================================================

-- 1. Verify plans table exists and has 3 rows
SELECT id, name, price_monthly, price_yearly,
  features->>'speed_cap_mb' as speed_cap,
  features->>'max_active_downloads' as max_downloads
FROM plans;

-- 2. Verify indexes exist
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'devices', 'usage_stats', 'payments')
ORDER BY tablename, indexname;

-- 3. Verify RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'touch_device', 'increment_usage')
ORDER BY routine_name;

-- 5. Verify views exist
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('user_subscriptions', 'user_usage_daily');
