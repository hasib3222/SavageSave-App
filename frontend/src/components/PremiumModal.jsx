import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppIcon from './AppIcon';
import { PLAN_IDS, PLAN_METADATA, PLAN_FEATURES } from '../plans/planConfig';

export default function PremiumModal({ open, onClose }) {
  const [hovered, setHovered] = useState(null);

  if (!open) return null;

  const plans = [PLAN_IDS.FREE, PLAN_IDS.PRO, PLAN_IDS.ULTRA];

  const featureRows = [
    { key: 'adsOn', label: 'Ad Experience', invert: true },
    { key: 'speedCapMbps', label: 'Speed Cap', numberLabel: (v) => v ? `${v} MB/s` : 'Unlimited' },
    { key: 'maxActiveDownloads', label: 'Active Downloads', numberLabel: (v) => v ? `${v} max` : 'Unlimited' },
    { key: 'unlimitedQueue', label: 'Queue Limit', boolLabel: (v) => v ? 'Unlimited' : '10/day' },
    { key: 'cloudSync', label: 'Cloud Sync' },
    { key: 'priorityDownloads', label: 'Priority Downloads' },
    { key: 'premiumTools', label: 'Premium Tools' },
    { key: 'multiDevice', label: 'Multi-Device' },
    { key: 'supportLevel', label: 'Support', custom: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 modal-backdrop p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl shadow-turbo mb-4 flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-400/30">
            <AppIcon src="icon/pro subscription icon.png" size={40} />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
            SavageSave Pro
          </h2>
          <p className="text-sm opacity-60 mt-1">Upgrade your download experience</p>
          <div className="inline-block mt-3 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-xs text-cyan-300">
            Coming Soon
          </div>
        </div>

        {/* Plan Cards */}
        <div className="px-6 grid grid-cols-3 gap-3">
          {plans.map((pid) => {
            const meta = PLAN_METADATA[pid];
            const features = PLAN_FEATURES[pid];
            const isHovered = hovered === pid;
            return (
              <motion.div
                key={pid}
                onMouseEnter={() => setHovered(pid)}
                onMouseLeave={() => setHovered(null)}
                className={`relative rounded-xl border p-4 transition-all duration-300 cursor-default ${
                  isHovered
                    ? 'border-cyan-400/40 bg-white/5 scale-[1.02]'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${pid === PLAN_IDS.ULTRA ? 'text-violet-300' : pid === PLAN_IDS.PRO ? 'text-cyan-300' : 'text-slate-400'}`}>
                  {meta.shortName}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {meta.priceMonthly === 0 ? 'Free' : `$${meta.priceMonthly}`}
                  {meta.priceMonthly > 0 && <span className="text-xs opacity-50 font-normal">/mo</span>}
                </div>
                {meta.priceYearly > 0 && (
                  <div className="text-[11px] opacity-40 mb-3">${meta.priceYearly}/yr</div>
                )}

                <div className="space-y-1.5 mt-3">
                  {featureRows.map((row) => {
                    const val = features[row.key];
                    let display;
                    if (row.custom && row.key === 'supportLevel') {
                      display = val === 'priority' ? 'Priority' : val === 'email' ? 'Email' : 'Community';
                    } else if (row.numberLabel) {
                      display = row.numberLabel(val);
                    } else if (row.boolLabel) {
                      display = row.boolLabel(val);
                    } else if (row.invert) {
                      display = val ? 'Ads shown' : 'Ad-free';
                    } else {
                      display = val ? '✓' : '—';
                    }
                    const active = row.invert ? !val : !!val;
                    return (
                      <div key={row.key} className="flex items-center justify-between text-[11px]">
                        <span className="opacity-50">{row.label}</span>
                        <span className={active ? 'text-emerald-300' : 'opacity-40'}>{display}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  disabled
                  className="mt-4 w-full py-2 rounded-lg text-xs font-medium bg-white/5 text-white/30 cursor-not-allowed"
                >
                  {pid === PLAN_IDS.FREE ? 'Current Plan' : 'Coming Soon'}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Feature highlights */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: 'icon/download icon.png', title: 'Full Speed', desc: 'No caps' },
              { src: 'icon/setting.png', title: 'Ad-Free', desc: 'Clean UI' },
              { src: 'icon/file icon.png', title: 'Cloud Sync', desc: 'Cross-device' },
              { src: 'icon/pro subscription icon.png', title: 'Priority', desc: 'Faster starts' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/5 p-3 text-center">
                <div className="h-6 mb-1 flex items-center justify-center">
                  <AppIcon src={f.src} size={20} />
                </div>
                <div className="text-xs font-medium">{f.title}</div>
                <div className="text-[10px] opacity-50">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex items-center justify-between border-t border-white/5">
          <div className="text-[11px] opacity-40">
            All plans include core SavageSave downloader. No forced signup required.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
