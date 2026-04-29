import React, { useEffect, useState } from 'react';
import { APP_VERSION_LABEL } from '../config/version';

/* ── SavageSave Splash ─────────────────────────────────────────────────────
   First launch: shows full-screen mode picker (Sigma / Cute).
   Subsequent launches: shows quick branded splash then enters last mode.
   ─────────────────────────────────────────────────────────────────────────── */
export default function SplashScreen({ onDone }) {
  const savedMode = localStorage.getItem('savagesave-mode');
  // If no saved mode, show picker. Otherwise show quick splash.
  const [phase, setPhase] = useState(savedMode ? 'logo' : 'pick');
  const [pickHover, setPickHover] = useState(null);
  const [logoOut, setLogoOut] = useState(false);

  useEffect(() => {
    if (phase !== 'logo') return;
    const t1 = setTimeout(() => setLogoOut(true), 1400);
    const t2 = setTimeout(() => onDone(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, onDone]);

  const pickMode = (m) => {
    localStorage.setItem('savagesave-mode', m);
    document.documentElement.classList.toggle('cute', m === 'cute');
    setPhase('logo');
  };

  const isCute = pickHover === 'cute';
  const bgPick = isCute
    ? 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(255,105,180,0.15), transparent 70%), #12040e'
    : 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(0,245,255,0.12), transparent 70%), #060911';

  /* ── Mode Picker ─────────────────────────────────────────────────────── */
  if (phase === 'pick') {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{
          background: bgPick,
          transition: 'background 0.5s ease',
          fontFamily: isCute ? "'Nunito', sans-serif" : "'Rajdhani', monospace",
        }}
      >
        {/* Brand */}
        <div
          className="text-5xl font-black tracking-tight mb-2 glitch"
          style={{
            background: isCute
              ? 'linear-gradient(135deg,#ff69b4,#c084fc,#fb7185)'
              : 'linear-gradient(135deg,#00f5ff,#3b82f6,#7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SavageSave
        </div>
        <div
          className="text-sm font-semibold tracking-widest mb-12"
          style={{ color: isCute ? 'rgba(255,180,220,0.6)' : 'rgba(0,245,255,0.55)' }}
        >
          TWO MODES. ONE SAVAGE ENGINE.
        </div>

        {/* Picker */}
        <div className="flex items-stretch gap-6">
          {/* SIGMA card */}
          <PickCard
            mode="sigma"
            isHovered={pickHover === 'sigma'}
            onHover={setPickHover}
            onClick={() => pickMode('sigma')}
            label="SIGMA"
            sublabel="SIGMA MODE BY SAVAGESAVE"
            desc="Skeleton · Hacker · Neon Vibe"
            emoji="💀"
            gradient="linear-gradient(135deg,#00f5ff,#3b82f6,#7c3aed)"
            border="rgba(0,245,255,0.45)"
            bg="rgba(0,245,255,0.06)"
          />
          {/* CUTE card */}
          <PickCard
            mode="cute"
            isHovered={pickHover === 'cute'}
            onHover={setPickHover}
            onClick={() => pickMode('cute')}
            label="CUTE"
            sublabel="CUTE MODE BY SAVAGESAVE"
            desc="Kawaii · Strawberry · Sweet Vibe"
            emoji="🌸"
            gradient="linear-gradient(135deg,#ff69b4,#c084fc,#fb7185)"
            border="rgba(255,105,180,0.50)"
            bg="rgba(255,105,180,0.08)"
          />
        </div>

        <div
          className="absolute bottom-6 font-mono text-[11px] tracking-wider"
          style={{ color: 'rgba(100,116,139,0.6)' }}
        >
          {APP_VERSION_LABEL}
        </div>
      </div>
    );
  }

  /* ── Quick Logo Splash ───────────────────────────────────────────────── */
  const mode = localStorage.getItem('savagesave-mode') || 'sigma';
  const isCuteMode = mode === 'cute';
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        opacity: logoOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        background: isCuteMode
          ? 'radial-gradient(ellipse at 50% 50%, rgba(255,105,180,0.12), transparent 70%), #12040e'
          : 'radial-gradient(ellipse at 50% 50%, rgba(0,245,255,0.10), transparent 70%), #060911',
        fontFamily: isCuteMode ? "'Nunito', sans-serif" : "'Rajdhani', monospace",
      }}
    >
      {/* Spinning ring */}
      <div className="relative flex items-center justify-center mb-6" style={{ animation: 'scaleIn 0.6s ease-out' }}>
        <img
          src="icon/main icon s.png"
          alt="SavageSave"
          className="relative rounded-2xl object-cover"
          style={{ width: 92, height: 92 }}
          draggable={false}
        />
      </div>

      <div
        className="text-4xl font-black tracking-tight"
        style={{
          background: isCuteMode
            ? 'linear-gradient(135deg,#ff69b4,#c084fc)'
            : 'linear-gradient(135deg,#00f5ff,#3b82f6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'scaleIn 0.5s 0.1s ease-out both',
        }}
      >
        SavageSave
      </div>
      <div className="text-xs tracking-[0.4em] mt-2" style={{ color: isCuteMode ? 'rgba(255,180,220,0.55)' : 'rgba(0,245,255,0.50)' }}>
        {isCuteMode ? 'SAVAGESAVE LOADING...' : 'SAVAGESAVE LOADING...'}
      </div>

      {/* Loading bar */}
      <div className="mt-10 rounded-full overflow-hidden" style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: '100%',
            background: isCuteMode ? 'linear-gradient(90deg,#ff69b4,#c084fc,#fb7185)' : 'linear-gradient(90deg,#00f5ff,#3b82f6,#7c3aed)',
            animation: 'shimmer 1.4s ease-out infinite',
          }}
        />
      </div>

      <div className="absolute bottom-6 font-mono text-[11px]" style={{ color: 'rgba(100,116,139,0.6)' }}>
        {APP_VERSION_LABEL}
      </div>
    </div>
  );
}

function PickCard({ mode, isHovered, onHover, onClick, label, sublabel, desc, emoji, gradient, border, bg }) {
  return (
    <button
      onMouseEnter={() => onHover(mode)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
      style={{
        width: 220,
        background: isHovered ? bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isHovered ? border : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20,
        padding: '32px 24px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? `0 12px 48px ${border.replace('0.45','0.3').replace('0.50','0.3')}` : 'none',
        backdropFilter: 'blur(20px)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 12 }}>{emoji}</div>
      <div
        style={{
          fontSize: 26, fontWeight: 900, letterSpacing: '0.06em', marginBottom: 6,
          background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {sublabel}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>{desc}</div>

      {isHovered && (
        <div
          style={{
            marginTop: 20, padding: '8px 0', borderRadius: 10,
            background: gradient, color: '#fff', fontWeight: 800,
            fontSize: 12, letterSpacing: '0.08em',
            animation: 'fadeUp 0.25s ease-out',
          }}
        >
          CHOOSE THIS →
        </div>
      )}
    </button>
  );
}
