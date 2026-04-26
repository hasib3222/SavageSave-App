-- ================================================================
-- TurboNest Supabase Schema v2.0 — Production Ready
-- Project: uroodwfcrrzaqqwzuvsy
-- Run in Supabase SQL Editor (new query) then execute
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. PLANS (seeded reference table — idempotent)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  description    text,
  price_monthly  decimal(10,2),
  price_yearly   decimal(10,2),
  features       jsonb NOT NULL DEFAULT '{}',
  display_order  int DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

INSERT INTO plans (id, name, description, price_monthly, price_yearly, features, display_order)
VALUES
  ('free',  'Free Plan',  'Core downloader with ads',              0,    0,    '{"ads_on":true,"speed_cap_mb":10,"max_active_downloads":2,"queue_limit":10,"cloud_sync":false,"priority_downloads":false,"premium_tools":false}',  1),
  ('pro',   'Pro Plan',   'Ad-free with faster speeds',              4.99, 49.99,'{"ads_on":false,"speed_cap_mb":null,"max_active_downloads":5,"queue_limit":null,"cloud_sync":false,"priority_downloads":true,"premium_tools":false}', 2),
  ('ultra', 'Ultra Plan', 'Unlimited everything + cloud sync',     9.99, 99.99,'{"ads_on":false,"speed_cap_mb":null,"max_active_downloads":null,"queue_limit":null,"cloud_sync":true,"priority_downloads":true,"premium_tools":true}',  3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order;

-- ────────────────────────────────────────────────────────────────
-- 2. SUBSCRIPTIONS (user plan assignments)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id               text REFERENCES plans(id),
  status                text NOT NULL DEFAULT 'active',
                          -- active | canceled | past_due | trialing | paused
  billing_interval      text DEFAULT 'monthly',
                          -- monthly | yearly | lifetime
  current_period_start  timestamptz DEFAULT now(),
  current_period_end    timestamptz,
  trial_end             timestamptz,
  canceled_at           timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (user_id, status)
);

-- Index: fast lookup by user + status
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status);
-- Index: expiration sweep
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions(current_period_end) WHERE status = 'active';

-- ────────────────────────────────────────────────────────────────
-- 3. DEVICES (multi-device sync)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text,
  device_id   text NOT NULL,
  device_type text, -- desktop | mobile | web
  last_seen   timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

-- ────────────────────────────────────────────────────────────────
-- 4. USAGE_STATS (daily aggregated analytics)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_stats (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date             date NOT NULL DEFAULT CURRENT_DATE,
  downloads_count  integer DEFAULT 0,
  bytes_downloaded bigint DEFAULT 0,
  queue_used       integer DEFAULT 0,
  time_online_sec  integer DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON usage_stats(user_id, date DESC);

-- ────────────────────────────────────────────────────────────────
-- 5. PAYMENTS (invoice / receipt ledger — future Stripe integration)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount        decimal(10,2) NOT NULL,
  currency      text DEFAULT 'USD',
  provider      text DEFAULT 'stripe', -- stripe | paypal | crypto
  provider_tx_id text,
  status        text NOT NULL DEFAULT 'pending',
                  -- pending | succeeded | failed | refunded | disputed
  receipt_url   text,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx ON payments(provider_tx_id) WHERE provider_tx_id IS NOT NULL;

-- ================================================================
-- RLS — Row Level Security Policies
-- ================================================================

-- PLANS: readable by everyone, writable by nobody (reference data)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans public read"
  ON plans FOR SELECT
  TO authenticated, anon
  USING (true);

-- SUBSCRIPTIONS: users read only their own; service_role can CRUD
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own subscriptions" ON subscriptions;
CREATE POLICY "Users insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own subscriptions" ON subscriptions;
CREATE POLICY "Users update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for webhook / Stripe integration)
DROP POLICY IF EXISTS "Service role all on subscriptions" ON subscriptions;
CREATE POLICY "Service role all on subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DEVICES: users full CRUD on their own devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users full own devices" ON devices;
CREATE POLICY "Users full own devices"
  ON devices FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USAGE_STATS: users read own; upsert from edge function
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage" ON usage_stats;
CREATE POLICY "Users read own usage"
  ON usage_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role upsert usage" ON usage_stats;
CREATE POLICY "Service role upsert usage"
  ON usage_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PAYMENTS: users read own receipts only
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments" ON payments;
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manage payments" ON payments;
CREATE POLICY "Service role manage payments"
  ON payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- Triggers & Functions
-- ================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Heartbeat: update device last_seen
CREATE OR REPLACE FUNCTION touch_device(_device_id text, _user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO devices (device_id, user_id, last_seen)
  VALUES (_device_id, _user_id, now())
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert daily usage stats (idempotent aggregation)
CREATE OR REPLACE FUNCTION increment_usage(
  _user_id uuid,
  _downloads integer DEFAULT 0,
  _bytes bigint DEFAULT 0,
  _queue integer DEFAULT 0,
  _online_sec integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_stats (user_id, date, downloads_count, bytes_downloaded, queue_used, time_online_sec)
  VALUES (_user_id, CURRENT_DATE, _downloads, _bytes, _queue, _online_sec)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    downloads_count = usage_stats.downloads_count + EXCLUDED.downloads_count,
    bytes_downloaded = usage_stats.bytes_downloaded + EXCLUDED.bytes_downloaded,
    queue_used = usage_stats.queue_used + EXCLUDED.queue_used,
    time_online_sec = usage_stats.time_online_sec + EXCLUDED.time_online_sec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- Helper Views (definitions only — no runtime execution)
-- ================================================================

-- Active subscription with plan features joined
CREATE OR REPLACE VIEW user_subscriptions AS
SELECT
  s.user_id,
  s.id AS subscription_id,
  s.status,
  s.current_period_end,
  p.id AS plan_id,
  p.name AS plan_name,
  p.price_monthly,
  p.price_yearly,
  p.features
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active';

-- Daily usage with plan context
CREATE OR REPLACE VIEW user_usage_daily AS
SELECT
  u.user_id,
  u.date,
  u.downloads_count,
  u.bytes_downloaded,
  u.queue_used,
  u.time_online_sec,
  p.id AS plan_id,
  p.name AS plan_name
FROM usage_stats u
LEFT JOIN subscriptions s ON s.user_id = u.user_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_id = p.id;

-- ================================================================
-- END OF SCHEMA — Run this entire file as one query in Supabase
-- ================================================================
