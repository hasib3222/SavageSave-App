import React from 'react';
import MONETIZATION from '../config/monetization';

/**
 * AdBanner — Bottom Dashboard Banner
 * ==================================
 * Small horizontal carousel placeholder.
 * Loads real ad network when ads_enabled = true.
 */
export default function AdBanner() {
  if (!MONETIZATION.monetization_enabled && !MONETIZATION.admin_override) {
    return null;
  }

  return (
    <div className="mt-3 glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-widest opacity-50 shrink-0">Sponsored</div>
        <div className="flex-1 rounded-xl bg-gradient-to-r from-slate-700/30 to-slate-800/30 border border-white/5 h-12 flex items-center justify-center gap-2">
          <span className="text-sm opacity-40">TurboNest Sponsors — Coming Soon</span>
          <div className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
