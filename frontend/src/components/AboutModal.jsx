import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, APP_VERSION_LABEL, APP_DEFAULT_CHANNEL } from '../config/version';
import AppIcon from './AppIcon';

export default function AboutModal({ open, onClose, channel = APP_DEFAULT_CHANNEL }) {
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    if (!open || !window.api?.onUpdateMessage) return;
    
    return window.api.onUpdateMessage(({ type, data }) => {
      if (type === 'checking') setUpdateState('checking');
      else if (type === 'available') { setUpdateState('available'); setUpdateInfo(data); }
      else if (type === 'latest') setUpdateState('latest');
      else if (type === 'progress') { setUpdateState('progress'); setUpdateProgress(data.percent); }
      else if (type === 'downloaded') { setUpdateState('downloaded'); setUpdateInfo(data); }
      else if (type === 'error') setUpdateState('error');
    });
  }, [open]);

  const handleCheck = () => {
    setUpdateState('checking');
    window.api?.checkForUpdates?.();
  };

  const handleRestart = () => {
    window.api?.quitAndInstall?.();
  };

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
                <AppIcon src="icon/main icon s.png" size={48} />
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

              <div className="w-full mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                {updateState === 'downloaded' ? (
                  <button
                    onClick={handleRestart}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-lg animate-pulse"
                  >
                    RESTART TO INSTALL
                  </button>
                ) : updateState === 'progress' ? (
                  <div className="w-full">
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span className="text-cyan-300">Downloading Update...</span>
                      <span className="text-white">{Math.round(updateProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300" style={{ width: `${updateProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCheck}
                    disabled={updateState === 'checking'}
                    className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {updateState === 'checking' ? 'CHECKING...' : 
                     updateState === 'latest' ? 'UP TO DATE ✅' : 
                     updateState === 'available' ? 'UPDATE FOUND ⚡' : 'CHECK FOR UPDATES'}
                  </button>
                )}
              </div>

              <div className="mt-2 text-[10px] text-slate-500/60 leading-relaxed uppercase tracking-tighter">
                Electron + React Production Build
              </div>

              <button
                onClick={onClose}
                className="mt-3 px-8 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition"
              >
                CLOSE
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
