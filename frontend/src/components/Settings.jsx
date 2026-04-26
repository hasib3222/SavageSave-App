import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AppIcon from './AppIcon';
import MONETIZATION, { setAdminConfig, resetToDefaults } from '../config/monetization';
import { APP_NAME, APP_VERSION_LABEL, APP_CHANNELS, APP_DEFAULT_CHANNEL } from '../config/version';

export default function Settings({ settings, setSettings }) {
  const { user, setAuthOpen, signOut } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminFlags, setAdminFlags] = useState({ ...MONETIZATION });
  const upd = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const toggleAdmin = (key) => {
    const next = { ...adminFlags, [key]: !adminFlags[key] };
    setAdminFlags(next);
    setAdminConfig({ [key]: next[key] });
  };

  const pickDir = async () => {
    const p = await window.api?.chooseFolder();
    if (p) upd('saveDir', p);
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <AppIcon src="/icon/setting.png" size={28} />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">Settings</h1>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="font-medium mb-3">Downloads</h3>
        <label className="text-xs opacity-70">Default save folder</label>
        <div className="flex gap-2 mt-1">
          <input value={settings.saveDir || ''} onChange={(e) => upd('saveDir', e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" />
          <button onClick={pickDir} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Browse…</button>
        </div>
        <label className="text-xs opacity-70 mt-4 block">Default connections</label>
        <input type="number" min={1} max={32} value={settings.connections}
          onChange={(e) => upd('connections', Number(e.target.value))}
          className="mt-1 w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" />

        <label className="flex items-center justify-between py-3 mt-2 cursor-pointer">
          <span className="text-sm">Use browser cookies for video downloads</span>
          <span
            onClick={() => { upd('cookieBrowser', settings.cookieBrowser ? '' : 'edge'); }}
            className={`w-10 h-6 rounded-full relative transition ${settings.cookieBrowser ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 ${settings.cookieBrowser ? 'left-5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-all shadow`}></span>
          </span>
        </label>
        {settings.cookieBrowser && (
          <>
            <label className="text-xs opacity-70 mt-2 block">Browser source</label>
            <select
              value={settings.cookieBrowser}
              onChange={(e) => upd('cookieBrowser', e.target.value)}
              className="mt-1 w-40 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
            >
              <option value="edge">Microsoft Edge</option>
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="brave">Brave</option>
              <option value="opera">Opera</option>
              <option value="vivaldi">Vivaldi</option>
              <option value="safari">Safari</option>
            </select>
          </>
        )}
        <p className="text-[10px] opacity-50 mt-2">When enabled, TurboNest reads cookies from your chosen browser to access age-restricted or subscriber-only videos. Public videos download fine without this.</p>
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="font-medium mb-3">Smart features</h3>
        <Toggle label="Clipboard monitoring (auto-detect links)"
          checked={settings.clipboardMonitor}
          onChange={(v) => upd('clipboardMonitor', v)} />
        <Toggle label="OS notifications on completion"
          checked={settings.notifications}
          onChange={(v) => upd('notifications', v)} />
        <Toggle label="Smart accelerator (dynamic chunking)"
          checked={settings.smartAccel}
          onChange={(v) => upd('smartAccel', v)} />
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="font-medium mb-3">Account</h3>
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 grid place-items-center text-sm font-medium">{user.email.charAt(0).toUpperCase()}</div>
              <div>
                <div className="text-sm font-medium">{user.email}</div>
                <div className="text-[11px] opacity-60">PRO Free · Supabase Auth</div>
              </div>
            </div>
            <button onClick={() => { signOut(); }} className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 text-sm hover:bg-rose-500/30 transition">Sign Out</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-70">Sign in to unlock cloud sync, cross-device queues, and PRO features.</div>
            <button onClick={() => setAuthOpen(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-medium shadow-turbo btn-turbo">Sign In</button>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-medium mb-3">About</h3>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium">{APP_NAME}</div>
            <div className="text-xs opacity-50 mt-0.5">
              Version <span className="text-cyan-300/80 font-mono">{APP_VERSION_LABEL}</span>
              <span className="mx-1.5 opacity-30">|</span>
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                {settings.releaseChannel || APP_DEFAULT_CHANNEL}
              </span>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-about-modal'))}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition border border-white/10"
          >
            More info
          </button>
        </div>

        <div className="mb-3">
          <label className="text-xs opacity-60 block mb-1">Release channel</label>
          <div className="flex gap-2">
            {APP_CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => upd('releaseChannel', ch)}
                className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                  (settings.releaseChannel || APP_DEFAULT_CHANNEL) === ch
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30 shadow-[0_0_8px_rgba(56,189,248,0.1)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm opacity-60">World-class desktop download manager built with Node.js + Electron + React + Tailwind. Multi-threaded HTTP Range downloads with live telemetry and smart video quality selection.</p>
      </div>

      {/* Admin Controls — Collapsible */}
      <div className="mt-4">
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          className="flex items-center gap-2 text-[11px] opacity-40 hover:opacity-70 transition"
        >
          <span>{adminOpen ? '▼' : '▶'}</span>
          <span>Admin Controls</span>
          <span className="text-[9px] opacity-50">(dev only)</span>
        </button>

        {adminOpen && (
          <div className="glass rounded-2xl p-5 mt-2 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Monetization Gates</h3>
              <button
                onClick={() => { resetToDefaults(); setAdminFlags({ ...MONETIZATION }); }}
                className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                Reset All
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(adminFlags).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs opacity-70 font-mono">{key}</span>
                  <span
                    onClick={() => toggleAdmin(key)}
                    className={`w-8 h-4 rounded-full relative transition ${val ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 ${val ? 'left-4' : 'left-0.5'} w-3 h-3 bg-white rounded-full transition-all shadow`} />
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 text-[10px] opacity-40">
              Changes persist in localStorage and take effect immediately. Restart app after toggling monetization_enabled for full backend sync.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm">{label}</span>
      <span
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full relative transition ${checked ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 ${checked ? 'left-5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-all shadow`}></span>
      </span>
    </label>
  );
}
