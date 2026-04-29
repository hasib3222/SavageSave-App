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
      className="w-56 shrink-0 flex flex-col gap-2.5 p-3 relative z-10"
      style={{ fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace" }}
    >
      {/* ── Brand header ───────────────────────────────────────────────── */}
      <div
        className="glass rounded-2xl px-4 py-3 relative overflow-hidden scanline"
        style={{ borderRadius: 'var(--card-radius)' }}
      >
        {/* Glow blob */}
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--brand), transparent 70%)', opacity: 0.25 }}
        />
        <div className="flex items-center gap-2.5 relative">
          <img
            src="icon/main icon s.png"
            alt="SavageSave"
            className="w-12 h-12 rounded-xl object-cover shrink-0"
            draggable={false}
          />
          <div>
            <div
              className="text-sm font-black tracking-tight brand-text"
              style={{ letterSpacing: '-0.01em' }}
            >
              SavageSave
            </div>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {isCute ? 'Cute Mode by SavageSave' : 'Sigma Mode by SavageSave'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mode switcher ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-1.5 flex gap-1" style={{ borderRadius: 'var(--card-radius)' }}>
        {['sigma', 'cute'].map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 text-xs font-black rounded-xl tracking-wider transition-all"
              style={{
                background: active ? 'var(--btn-grad)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? 'var(--glow-sm)' : 'none',
                letterSpacing: '0.05em',
                borderRadius: 'var(--card-radius-sm)',
                transition: 'var(--t)',
              }}
            >
              {m === 'sigma' ? '⚡ SIGMA' : '🌸 CUTE'}
            </button>
          );
        })}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="glass flex-1 rounded-2xl p-2 flex flex-col gap-0.5" style={{ borderRadius: 'var(--card-radius)' }}>
        {NAV.map((it) => {
          const active = view === it.id;
          const label  = isCute ? it.cute : it.sigma;
          const icon   = isCute ? it.cuteIcon : it.sigmaIcon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 text-sm font-semibold w-full rounded-xl
                ${active ? 'active' : ''}`}
              style={{
                color: active ? 'var(--text-accent)' : 'var(--text-muted)',
                borderRadius: 'var(--card-radius-sm)',
              }}
            >
              <span
                className="w-7 h-7 rounded-lg grid place-items-center text-sm shrink-0 transition-all"
                style={{
                  background: active ? 'var(--btn-grad)' : 'rgba(255,255,255,0.04)',
                  boxShadow: active ? 'var(--glow-sm)' : 'none',
                }}
              >
                {icon}
              </span>
              <span className="flex-1 text-left">{label.replace(/^[^ ]+ /, '')}</span>
              {it.id === 'dashboard' && counts.active > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: 'var(--btn-grad)', color: '#fff', minWidth: 20, textAlign: 'center' }}
                >
                  {counts.active}
                </span>
              )}
              {it.id === 'completed' && counts.completed > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                  {counts.completed}
                </span>
              )}
            </button>
          );
        })}

        {/* Sigma-only: hacker quote */}
        {!isCute && (
          <div
            className="mt-auto mx-2 mb-1 p-2.5 rounded-xl"
            style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.08)' }}
          >
            <div className="text-[10px] font-bold" style={{ color: 'var(--brand)', fontFamily: "'Share Tech Mono',monospace" }}>
              "DISCIPLINE.<br/>FOCUS.<br/>DOMINATE."
            </div>
          </div>
        )}

        {/* Cute-only: encouragement */}
        {isCute && (
          <div
            className="mt-auto mx-2 mb-1 p-2.5 rounded-xl text-center"
            style={{ background: 'rgba(255,105,180,0.06)', border: '1px solid rgba(255,105,180,0.12)' }}
          >
            <div className="text-[11px] font-extrabold" style={{ color: 'var(--brand)' }}>
              STAY SWEET 🍓<br/>STAY HAPPY 💕<br/>KEEP DOWNLOADING
            </div>
          </div>
        )}
      </nav>

      {/* ── Pro CTA ────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-3 relative overflow-hidden" style={{ borderRadius: 'var(--card-radius)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 20%, var(--brand3), transparent 70%)', opacity: 0.15 }}
        />
        <div className="text-xs font-black brand-text relative mb-0.5">SavageSave Pro</div>
        <div className="text-[10px] relative mb-2" style={{ color: 'var(--text-muted)' }}>Unlock all savage features</div>
        <button
          onClick={onOpenPremium}
          className="btn-savage w-full py-2 text-xs font-black"
          style={{ borderRadius: 'var(--card-radius-sm)' }}
        >
          {isCute ? '✨ Coming Soon ✨' : '⚡ UNLOCK PRO ⚡'}
        </button>
      </div>

      {/* ── Auth ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-3" style={{ borderRadius: 'var(--card-radius)' }}>
        {user ? (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-sm font-black shrink-0"
              style={{ background: 'var(--btn-grad)', boxShadow: 'var(--glow-sm)' }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</div>
              <div className={`text-[10px] mt-0.5 ${meta.badge}`}>{meta.shortName}</div>
            </div>
            <button onClick={() => signOut()} className="text-[11px] px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}>Out</button>
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-active)',
              color: 'var(--brand)', borderRadius: 'var(--card-radius-sm)',
            }}
          >
            {isCute ? '🔐 Sign In / Register' : '► LOGIN / REGISTER'}
          </button>
        )}
      </div>

      <AdSidebar />
    </aside>
  );
}
