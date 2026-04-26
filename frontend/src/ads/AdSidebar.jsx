import React from 'react';
import AppIcon from '../components/AppIcon';
import MONETIZATION from '../config/monetization';

/**
 * AdSidebar — Placeholder Sponsorship Panel
 * =========================================
 * Displays elegant "Coming Soon" placeholder.
 * When ads_enabled flips true, this slot loads real ad content.
 */
export default function AdSidebar() {
  // If monetization is fully off, render nothing (clean UI)
  if (!MONETIZATION.monetization_enabled && !MONETIZATION.admin_override) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-4 mt-3">
      <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Sponsors</div>
      <div className="rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-white/5 p-4 text-center min-h-[140px] flex flex-col items-center justify-center gap-2">
        <AppIcon src="/icon/pro subscription icon.png" size={32} className="opacity-40" />
        <div className="text-xs font-medium opacity-60">TurboNest Sponsors</div>
        <div className="text-[11px] opacity-40">Coming Soon</div>
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-violet-500/30 mt-1 animate-pulse" />
      </div>
    </div>
  );
}
