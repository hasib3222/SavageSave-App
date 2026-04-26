/**
 * TurboNest Backend Throttle API
 * ================================
 * Provides speed-cap configuration endpoints.
 * Wires into downloadEngine.js when monetization_enabled = true.
 * Currently inactive — returns no-cap for all requests.
 */

const MONETIZATION_ENABLED = false;

/**
 * Get the speed cap (MB/s) for a user based on their subscription tier.
 * Returns null = unlimited.
 */
function getSpeedCapForUser(/* userId, planId */) {
  if (!MONETIZATION_ENABLED) return null;
  // Future: query Supabase subscriptions table
  // const { data } = await supabase.from('subscriptions').select('plan_id').eq('user_id', userId).single();
  // return planSpeedCaps[data?.plan_id] || 10;
  return null;
}

/**
 * Express middleware-style: attach throttle config to request.
 */
function attachThrottleConfig(req, res, next) {
  req.turbonestThrottle = {
    enabled: MONETIZATION_ENABLED,
    capMbps: getSpeedCapForUser(req.user?.id),
  };
  next();
}

/**
 * Apply real throttling to a download stream.
 * Uses token-bucket algorithm for smooth rate limiting.
 */
class TokenBucketThrottle {
  constructor(capMbps) {
    this.capBps = capMbps * 1024 * 1024;
    this.tokens = this.capBps;
    this.lastRefill = Date.now();
    this.bucketSize = this.capBps;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.bucketSize, this.tokens + elapsed * this.capBps);
    this.lastRefill = now;
  }

  consume(bytes) {
    this.refill();
    if (this.tokens >= bytes) {
      this.tokens -= bytes;
      return 0;
    }
    const deficit = bytes - this.tokens;
    this.tokens = 0;
    return (deficit / this.capBps) * 1000;
  }

  async throttleChunk(chunk) {
    const delayMs = this.consume(chunk.length);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return chunk;
  }
}

module.exports = {
  MONETIZATION_ENABLED,
  getSpeedCapForUser,
  attachThrottleConfig,
  TokenBucketThrottle,
};
