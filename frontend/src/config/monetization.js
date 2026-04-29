/**
 * SavageSave Monetization Config
 * =====================================
 * Single source of truth for all premium feature gates.
 * Toggle these flags to launch monetization.
 * All enforcement logic checks these flags before applying limits.
 */

const MONETIZATION = {
  // Master switch — when false, app behaves as fully unlimited (current mode)
  monetization_enabled: false,

  // Feature toggles (effective only when monetization_enabled === true)
  ads_enabled: false,
  subscriptions_enabled: false,
  speed_caps_enabled: false,
  queue_limits_enabled: false,
  cloud_sync_enabled: false,
  priority_downloads_enabled: false,
  premium_tools_enabled: false,

  // Admin override (local dev / beta testing)
  admin_override: false,
};

/** Read persisted admin overrides from localStorage */
try {
  const raw = localStorage.getItem('savagesave-admin-config');
  if (raw) {
    const saved = JSON.parse(raw);
    Object.assign(MONETIZATION, saved);
  }
} catch { /* ignore */ }

/** Persist admin config changes */
export function setAdminConfig(patch) {
  Object.assign(MONETIZATION, patch);
  try {
    localStorage.setItem('savagesave-admin-config', JSON.stringify(MONETIZATION));
  } catch { /* ignore */ }
}

/** Check if any monetization feature is active */
export function isMonetizationActive() {
  return MONETIZATION.monetization_enabled || MONETIZATION.admin_override;
}

/** Check if a specific feature gate is open */
export function isFeatureEnabled(key) {
  if (!isMonetizationActive()) return false;
  return !!MONETIZATION[key];
}

/** Reset all gates to default (disabled) — useful for testing */
export function resetToDefaults() {
  const defaults = {
    monetization_enabled: false,
    ads_enabled: false,
    subscriptions_enabled: false,
    speed_caps_enabled: false,
    queue_limits_enabled: false,
    cloud_sync_enabled: false,
    priority_downloads_enabled: false,
    premium_tools_enabled: false,
    admin_override: false,
  };
  Object.assign(MONETIZATION, defaults);
  try {
    localStorage.removeItem('savagesave-admin-config');
  } catch { /* ignore */ }
}

export default MONETIZATION;
