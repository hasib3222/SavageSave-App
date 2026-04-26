import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import AdSidebar from '../ads/AdSidebar';
import AppIcon from './AppIcon';

const items = [
  { id: 'dashboard', label: 'Downloads', iconSrc: '/icon/download icon.png' },
  { id: 'completed', label: 'Completed', iconSrc: '/icon/compleat download.png' },
  { id: 'scheduler', label: 'Scheduler', iconSrc: '/icon/file icon.png' },
  { id: 'settings', label: 'Settings', iconSrc: '/icon/setting.png' },
];

export default function Sidebar({ view, setView, counts, theme, setTheme, onOpenPremium }) {
  const { user, setAuthOpen, signOut } = useAuth();
  const { meta } = useSubscription();

  return (
    <aside className="w-60 shrink-0 p-4 flex flex-col gap-3">
      <div className="glass rounded-2xl p-4 relative scanline">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="TurboNest" className="w-10 h-10 rounded-xl shadow-turbo animate-glow object-contain" />
          <div>
            <div className="text-sm tracking-widest text-blue-300 font-semibold">TurboNest</div>
            <div className="text-xs opacity-70">Download Manager</div>
          </div>
        </div>
      </div>

      <nav className="glass rounded-2xl p-2 flex flex-col gap-1">
        {items.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`group sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                ${active
                  ? 'active text-white turbo-ring'
                  : 'hover:bg-white/5 text-slate-300'}`}
            >
              <AppIcon src={it.iconSrc} size={20} className="opacity-80 group-hover:opacity-100" />
              <span className="flex-1 text-left">{it.label}</span>
              {it.id === 'dashboard' && counts.active > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">{counts.active}</span>
              )}
              {it.id === 'completed' && counts.completed > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">{counts.completed}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="glass rounded-2xl p-3 mt-auto">
        <div className="text-xs opacity-60 mb-2">Theme</div>
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 text-xs py-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
          >Dark</button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 text-xs py-1.5 rounded-lg ${theme === 'light' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
          >Light</button>
        </div>
      </div>

      {/* TurboNest Pro CTA */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-3 mb-2">
          <AppIcon src="/icon/pro subscription icon.png" size={28} className="drop-shadow-[0_0_6px_rgba(139,92,246,0.4)]" />
          <div>
            <div className="text-xs font-medium">TurboNest Pro</div>
            <div className="text-[10px] opacity-50">Upgrade your experience</div>
          </div>
        </div>
        <button
          onClick={onOpenPremium}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-400/30 text-violet-300 text-xs font-medium hover:brightness-110 transition"
        >
          Coming Soon
        </button>
      </div>

      {/* User Account */}
      <div className="glass rounded-2xl p-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 grid place-items-center text-sm font-medium">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <div className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit ${meta.badge}`}>{meta.shortName}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
              title="Sign out"
            >
              Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/30 text-cyan-300 text-sm font-medium hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <AppIcon src="/icon/sign inregister batton.png" size={18} /> Sign In / Register
          </button>
        )}
      </div>

      <AdSidebar />
    </aside>
  );
}
