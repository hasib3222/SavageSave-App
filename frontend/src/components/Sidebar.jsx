import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import AdSidebar from '../ads/AdSidebar';

/* Mode-specific nav items */
const NAV = [
  { id: 'dashboard', sigma: '⬇  Downloads',   cute: '⬇  Downloads',    sigmaIcon: '⬇', cuteIcon: '🍓' },
  { id: 'completed', sigma: '💀  Power Queue', cute: '🌸  Sweet Queue',  sigmaIcon: '💀', cuteIcon: '🌸' },
  { id: 'scheduler', sigma: '⏱  Scheduler',   cute: '📅  Planner',      sigmaIcon: '⏱', cuteIcon: '📅' },
  { id: 'settings',  sigma: '⚙  Settings',    cute: '⚙  Settings',     sigmaIcon: '⚙', cuteIcon: '⚙' },
];

export default function Sidebar({ view, setView, counts, mode, setMode, onOpenPremium }) {
  const { user, setAuthOpen, signOut } = useAuth();
  const { meta } = useSubscription();
  const isCute = mode === 'cute';

  const switchMode = (m) => {
    // Add brief transition class to smooth the swap
    document.documentElement.classList.add('mode-transitioning');
    document.documentElement.classList.toggle('cute', m === 'cute');
    localStorage.setItem('savagesave-mode', m);
    setMode(m);
    setTimeout(() => document.documentElement.classList.remove('mode-transitioning'), 700);
  };

  return (
    <aside
      className="w-56 shrink-0 flex flex-col gap-3.5 p-3.5 relative z-10"
      style={{ fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace" }}
    >
      {/* ── Brand header ───────────────────────────────────────────────── */}
      <div
        className="glass rounded-2xl px-4 py-4 relative overflow-hidden scanline"
        style={{ borderRadius: 'var(--card-radius)' }}
      >
        {/* Glow blob */}
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--brand), transparent 70%)', opacity: 0.25 }}
        />
        <div className="flex items-center gap-3 relative">
          <img
            src="icon/main icon s.png"
            alt="SavageSave"
            className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-lg"
            draggable={false}
          />
          <div>
            <div
              className="text-sm font-black tracking-tight brand-text"
              style={{ letterSpacing: '-0.01em' }}
            >
              SavageSave
            </div>
            <div className="text-[10px] font-bold opacity-80" style={{ color: 'var(--text-muted)' }}>
              {isCute ? 'Cute Mode' : 'Sigma Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mode switcher ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-1 flex gap-1.5" style={{ borderRadius: 'var(--card-radius)' }}>
        {['sigma', 'cute'].map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-1.5 text-[10px] font-black rounded-xl tracking-widest transition-all duration-300"
              style={{
                background: active ? 'var(--btn-grad)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? 'var(--glow-sm)' : 'none',
                borderRadius: 'var(--card-radius-sm)',
                opacity: active ? 1 : 0.6,
              }}
            >
              {m === 'sigma' ? 'SIGMA' : 'CUTE'}
            </button>
          );
        })}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="glass flex-1 rounded-2xl p-2 flex flex-col gap-1" style={{ borderRadius: 'var(--card-radius)' }}>
        {NAV.map((it) => {
          const active = view === it.id;
          const label  = isCute ? it.cute : it.sigma;
          const icon   = isCute ? it.cuteIcon : it.sigmaIcon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`sidebar-item flex items-center gap-3 px-3.5 py-2.5 text-sm font-bold w-full rounded-xl transition-all duration-200
                ${active ? 'active scale-[1.02]' : 'hover:scale-[1.01]'}`}
              style={{
                color: active ? 'var(--text-accent)' : 'var(--text-muted)',
                borderRadius: 'var(--card-radius-sm)',
              }}
            >
              <span
                className="w-8 h-8 rounded-lg grid place-items-center text-sm shrink-0 transition-all shadow-inner"
                style={{
                  background: active ? 'var(--btn-grad)' : 'rgba(255,255,255,0.03)',
                  boxShadow: active ? 'var(--glow-sm)' : 'none',
                }}
              >
                {icon}
              </span>
              <span className="flex-1 text-left tracking-tight">{label.replace(/^[^ ]+ /, '')}</span>
              {it.id === 'dashboard' && counts.active > 0 && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-black shadow-lg"
                  style={{ background: 'var(--btn-grad)', color: '#fff', minWidth: 22, textAlign: 'center' }}
                >
                  {counts.active}
                </span>
              )}
              {it.id === 'completed' && counts.completed > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/10">
                  {counts.completed}
                </span>
              )}
            </button>
          );
        })}

        {/* Sigma-only: hacker quote */}
        {!isCute && (
          <div
            className="mt-auto mx-1 mb-1 p-3 rounded-xl border border-white/5"
            style={{ background: 'rgba(0,245,255,0.02)' }}
          >
            <div className="text-[9px] font-bold opacity-60 leading-tight" style={{ color: 'var(--brand)', fontFamily: "'Share Tech Mono',monospace" }}>
              // DISCIPLINE<br/>// FOCUS<br/>// DOMINATE
            </div>
          </div>
        )}

        {/* Cute-only: encouragement */}
        {isCute && (
          <div
            className="mt-auto mx-1 mb-1 p-3 rounded-xl text-center border border-pink-500/5"
            style={{ background: 'rgba(255,105,180,0.04)' }}
          >
            <div className="text-[10px] font-black opacity-80" style={{ color: 'var(--brand)' }}>
              STAY SWEET 🍓<br/>KEEP GOING ✨
            </div>
          </div>
        )}
      </nav>

      {/* ── Pro CTA ────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden" style={{ borderRadius: 'var(--card-radius)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 20%, var(--brand3), transparent 70%)', opacity: 0.15 }}
        />
        <div className="text-[11px] font-black brand-text relative mb-1 tracking-wider uppercase">SavageSave Pro</div>
        <div className="text-[10px] relative mb-3 opacity-70" style={{ color: 'var(--text-muted)' }}>Unlock elite features</div>
        <button
          onClick={onOpenPremium}
          className="btn-savage w-full py-2.5 text-[11px] font-black shadow-xl"
          style={{ borderRadius: 'var(--card-radius-sm)' }}
        >
          {isCute ? 'COMING SOON' : 'UPGRADE NOW'}
        </button>
      </div>

      {/* ── Auth ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-3" style={{ borderRadius: 'var(--card-radius)' }}>
        {user ? (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-sm font-black shrink-0 shadow-lg"
              style={{ background: 'var(--btn-grad)', border: '2px solid rgba(255,255,255,0.1)' }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>{user.email}</div>
              <div className={`text-[9px] mt-0.5 font-black uppercase opacity-80 ${meta.badge}`}>{meta.shortName}</div>
            </div>
            <button onClick={() => signOut()} className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/5" style={{ color: 'var(--text-muted)' }}>OUT</button>
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full py-3 rounded-xl text-[10px] font-black tracking-widest transition-all hover:brightness-110 shadow-lg"
            style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              color: 'var(--brand)', borderRadius: 'var(--card-radius-sm)',
            }}
          >
            {isCute ? 'SIGN IN / REGISTER' : 'LOGIN / REGISTER'}
          </button>
        )}
      </div>

      <AdSidebar />
    </aside>
  );
}
