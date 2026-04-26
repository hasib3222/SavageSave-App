import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, APP_VERSION_LABEL, APP_DEFAULT_CHANNEL } from '../config/version';
import AppIcon from './AppIcon';

export default function AboutModal({ open, onClose, channel = APP_DEFAULT_CHANNEL }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0f1525]/95 backdrop-blur-xl p-6 text-center shadow-2xl"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 text-lg"
            >&#10005;</button>

            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                <AppIcon src="/icon.png" size={48} />
              </div>

              <div className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                {APP_NAME}
              </div>

              <div className="text-[11px] tracking-widest text-blue-300/70 uppercase">
                DOWNLOAD SMARTER, FASTER
              </div>

              <div className="mt-2 space-y-1.5 text-sm text-slate-300/80">
                <div>
                  <span className="text-slate-500 mr-2">Version</span>
                  <span className="font-medium text-cyan-200/90">{APP_VERSION_LABEL}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-2">Build channel</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shadow-[0_0_8px_rgba(56,189,248,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(56,189,248,0.6)]" />
                    {channel}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
                A world-class desktop download manager built with Node.js, Electron, React and Tailwind. Multi-threaded acceleration with smart video quality selection.
              </p>

              <button
                onClick={onClose}
                className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium shadow-turbo hover:shadow-[0_0_16px_rgba(56,189,248,0.4)] transition"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
