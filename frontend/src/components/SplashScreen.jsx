import React, { useEffect, useState } from 'react';
import { APP_VERSION_LABEL } from '../config/version';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in'); // in | out | done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1200);
    const t2 = setTimeout(() => { setPhase('done'); onDone(); }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-4 animate-[scaleIn_0.5s_ease-out]">
        <img src="/icon.png" alt="TurboNest" className="w-14 h-14 rounded-2xl shadow-turbo animate-glow object-contain" />
        <div>
          <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
            TurboNest
          </div>
          <div className="text-xs tracking-widest text-blue-300/80 mt-1">
            DOWNLOAD SMARTER, FASTER
          </div>
        </div>
      </div>
      <div className="h-[2px] mt-6 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 animate-[shimmerGlow_1.2s_ease-out_infinite]" style={{ width: 160 }} />
      <div className="absolute bottom-6 text-[11px] tracking-wider text-slate-500/80 font-mono">
        {APP_VERSION_LABEL}
      </div>
    </div>
  );
}
