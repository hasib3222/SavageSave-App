import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import AppIcon from './AppIcon';
import MONETIZATION, { setAdminConfig, resetToDefaults } from '../config/monetization';
import { APP_NAME, APP_VERSION_LABEL, APP_CHANNELS, APP_DEFAULT_CHANNEL } from '../config/version';

const ADMIN_EMAIL = 'hasiburrahman1382005@gmail.com';
const ADMIN_PASSWORD_HASH = 'admin123'; // Simple hash for demo - use proper hashing in production

class SettingsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('Settings Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 p-6 flex items-center justify-center bg-[#060911]">
          <div className="glass p-8 max-w-md text-center border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl grid place-items-center mx-auto mb-4 border border-rose-500/20">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-black text-rose-400 mb-2 uppercase tracking-tighter">Control Center Crash</h2>
            <p className="text-sm opacity-60 mb-6 leading-relaxed">
              The configuration module encountered a runtime error. This has been logged for repair.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest border border-white/10 transition-all"
            >
              REBOOT MODULE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SettingsContent({ settings = {}, setSettings }) {
  const { user, setAuthOpen, signOut } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminFlags, setAdminFlags] = useState({ ...MONETIZATION });
  const [adminPass, setAdminPass] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminError, setAdminError] = useState('');
  
  // Update system state
  const [updateState, setUpdateState] = useState('idle'); // idle, checking, available, latest, progress, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateErr, setUpdateErr] = useState('');

  const upd = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!window.api?.onUpdateMessage) return;
    
    const unbind = window.api.onUpdateMessage(({ type, data }) => {
      if (type === 'checking') {
        setUpdateState('checking');
        setUpdateErr('');
      } else if (type === 'available') {
        setUpdateState('available');
        setUpdateInfo(data);
      } else if (type === 'latest') {
        setUpdateState('latest');
      } else if (type === 'progress') {
        setUpdateState('progress');
        setUpdateProgress(data.percent);
      } else if (type === 'downloaded') {
        setUpdateState('downloaded');
        setUpdateInfo(data);
      } else if (type === 'error') {
        setUpdateState('error');
        setUpdateErr(data);
      }
    });

    return unbind;
  }, []);

  const handleCheckUpdates = () => {
    setUpdateState('checking');
    window.api?.checkForUpdates?.();
  };

  const handleRestart = () => {
    window.api?.quitAndInstall?.();
  };

  const isAdminUser = user?.email === ADMIN_EMAIL;

  const verifyAdmin = () => {
    if (!isAdminUser) {
      setAdminError('Not authorized');
      return;
    }
    if (adminPass === 'savagesave2024') {
      setAdminVerified(true);
      setAdminError('');
    } else {
      setAdminError('Invalid password');
      setAdminVerified(false);
    }
  };

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
    <div className="flex-1 overflow-y-auto p-6 grid-bg relative z-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 glass rounded-2xl shadow-xl">
          <AppIcon src="icon/main icon s.png" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter brand-text glitch">Control Center</h1>
          <div className="text-[11px] font-bold opacity-50 uppercase tracking-widest mt-1">SavageSave Terminal • System Configuration</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Downloads Group */}
        <section className="glass rounded-2xl p-6 border-white/5 shadow-2xl hover:border-white/10 transition-all">
          <h3 className="font-black text-sm uppercase tracking-widest mb-6 opacity-90 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            Downloads
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-2 block">Default Storage Path</label>
              <div className="flex gap-2">
                <input value={settings?.saveDir || ''} onChange={(e) => upd('saveDir', e.target.value)}
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-cyan-500/50 focus:bg-black/40 transition-all outline-none" />
                <button onClick={pickDir} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all border border-white/5 uppercase tracking-tighter">Browse</button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-2 block">Network Connections</label>
              <div className="flex items-center gap-4">
                <input type="number" min={1} max={128} value={settings?.connections || 8}
                  onChange={(e) => upd('connections', Number(e.target.value))}
                  className="w-24 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-cyan-500/50 focus:bg-black/40 transition-all outline-none" />
                <div className="text-[10px] opacity-40 leading-tight font-bold">MAX: 128 CONNS<br/>Optimized for speed</div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center justify-between py-1 cursor-pointer group">
                <div>
                  <div className="text-sm font-bold group-hover:text-cyan-300 transition-colors">Browser Cookies</div>
                  <div className="text-[10px] opacity-40">Access restricted content from your browser</div>
                </div>
                <Toggle checked={!!settings?.cookieBrowser} onChange={() => upd('cookieBrowser', settings?.cookieBrowser ? '' : 'edge')} />
              </label>
              
              <AnimatePresence>
                {settings?.cookieBrowser && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                      <label className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-2 block">Browser Engine</label>
                      <select
                        value={settings?.cookieBrowser}
                        onChange={(e) => upd('cookieBrowser', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold outline-none cursor-pointer focus:border-cyan-500/50"
                      >
                        <option value="edge">Microsoft Edge</option>
                        <option value="chrome">Chrome</option>
                        <option value="firefox">Firefox</option>
                        <option value="brave">Brave</option>
                        <option value="opera">Opera</option>
                        <option value="vivaldi">Vivaldi</option>
                        <option value="safari">Safari</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Smart Features Group */}
        <section className="glass rounded-2xl p-6 border-white/5 shadow-2xl hover:border-white/10 transition-all">
          <h3 className="font-black text-sm uppercase tracking-widest mb-6 opacity-90 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            Automation
          </h3>
          
          <div className="space-y-1">
            <ToggleItem 
              label="Clipboard Monitoring" 
              desc="Auto-detect links from clipboard"
              checked={!!settings?.clipboardMonitor} 
              onChange={(v) => upd('clipboardMonitor', v)} 
            />
            <ToggleItem 
              label="OS Notifications" 
              desc="Alert when downloads complete"
              checked={!!settings?.notifications} 
              onChange={(v) => upd('notifications', v)} 
            />
            <ToggleItem 
              label="Smart Accelerator" 
              desc="Dynamic multi-threading"
              checked={!!settings?.smartAccel} 
              onChange={(v) => upd('smartAccel', v)} 
            />
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <h3 className="font-black text-[10px] uppercase tracking-widest mb-4 opacity-40">Account & Identity</h3>
            {user ? (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 grid place-items-center text-sm font-black shadow-lg border border-white/10">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-tight">{user.email}</div>
                    <div className="text-[10px] font-black uppercase tracking-tighter text-cyan-400/80">PRO MEMBER</div>
                  </div>
                </div>
                <button onClick={() => signOut()} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20">Sign Out</button>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 rounded-2xl border border-white/5 text-center">
                <div className="text-xs font-bold opacity-70 mb-3">Sync your downloads & settings</div>
                <button onClick={() => setAuthOpen(true)} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-[10px] font-black tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">CONNECT ACCOUNT</button>
              </div>
            )}
          </div>
        </section>

        {/* Updates Card */}
        <section className="glass rounded-2xl p-6 border-white/5 shadow-2xl hover:border-white/10 transition-all lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="font-black text-sm uppercase tracking-widest mb-4 opacity-90 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Software Updates
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold opacity-60">Build Version</span>
                <span className="font-mono text-[11px] text-cyan-300 px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20">{APP_VERSION_LABEL}</span>
              </div>
              
              <div className="mt-4">
                {updateState === 'checking' && <div className="text-[11px] font-black text-cyan-400 uppercase animate-pulse">Checking Repository...</div>}
                {updateState === 'latest' && <div className="text-[11px] font-black text-emerald-400 uppercase">System is up to date</div>}
                {updateState === 'available' && <div className="text-[11px] font-black text-blue-400 uppercase">Update {updateInfo?.version} detected</div>}
                {updateState === 'progress' && (
                  <div className="mt-3 w-full max-w-sm">
                    <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase opacity-60">
                      <span>Downloading Assets</span>
                      <span>{Math.round(updateProgress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]" style={{ width: `${updateProgress}%` }} />
                    </div>
                  </div>
                )}
                {updateState === 'downloaded' && <div className="text-[11px] font-black text-emerald-400 uppercase animate-bounce mt-1">Update Ready for Installation</div>}
                {updateState === 'error' && <div className="text-[11px] font-black text-rose-400 uppercase">Sync Error: {updateErr}</div>}
              </div>
            </div>

            <div className="flex shrink-0">
              {updateState === 'downloaded' ? (
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all tracking-widest uppercase animate-pulse"
                >
                  RESTART & APPLY
                </button>
              ) : (
                <button
                  disabled={updateState === 'checking' || updateState === 'progress'}
                  onClick={handleCheckUpdates}
                  className={`px-6 py-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all shadow-xl ${
                    updateState === 'checking' || updateState === 'progress'
                      ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  {updateState === 'checking' ? 'SYNCING...' : 'CHECK FOR UPDATES'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* About Card */}
        <section className="glass rounded-2xl p-6 border-white/5 shadow-2xl hover:border-white/10 lg:col-span-2 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 glass rounded-2xl grid place-items-center shadow-2xl border-white/10">
                <AppIcon src="icon/main icon s.png" size={48} />
              </div>
              <div>
                <h3 className="text-xl font-black brand-text">{APP_NAME} <span className="text-[10px] text-muted opacity-50 font-mono tracking-tighter uppercase ml-2">PRO EDITION</span></h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Release Channel</span>
                  <div className="flex gap-1.5">
                    {APP_CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        onClick={() => upd('releaseChannel', ch)}
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all border ${
                          (settings?.releaseChannel || APP_DEFAULT_CHANNEL) === ch
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
                            : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-400'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-about-modal'))}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
            >
              SYSTEM INFO
            </button>
          </div>
          
          <p className="mt-6 text-xs font-medium leading-relaxed opacity-50 max-w-2xl">
            SavageSave is a professional-grade multi-threaded download engine optimized for high-performance data retrieval. 
            Engineered with a focus on speed, reliability, and modern UI aesthetics. Built with Node.js, Electron, and React.
          </p>
        </section>
      </div>

      {/* Admin Controls — Hidden unless verified */}
      {isAdminUser && (
        <div className="mt-12 max-w-7xl mx-auto">
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-20 hover:opacity-50 transition-all ml-2"
          >
            <span>{adminOpen ? '▼' : '▶'}</span>
            <span>RESTRICTED_ACCESS</span>
          </button>

          {adminOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 mt-4 border-white/5 shadow-2xl bg-black/40"
            >
              {!adminVerified ? (
                <div className="flex items-center gap-4">
                  <input
                    type="password"
                    placeholder="ENTER AUTH KEY"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-rose-500/50"
                  />
                  {adminError && <div className="text-[10px] font-black text-rose-400 uppercase">{adminError}</div>}
                  <button
                    onClick={verifyAdmin}
                    className="px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                  >
                    VERIFY
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-rose-500">SYSTEM_OVERRIDE</h3>
                    <button
                      onClick={() => { resetToDefaults(); setAdminFlags({ ...MONETIZATION }); }}
                      className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10"
                    >
                      RESET_MODULES
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(adminFlags).map(([key, val]) => (
                      <label key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer">
                        <span className="text-[10px] font-mono font-bold opacity-60 uppercase">{key}</span>
                        <Toggle small checked={val} onChange={() => toggleAdmin(key)} />
                      </label>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings(props) {
  return (
    <SettingsErrorBoundary>
      <SettingsContent {...props} />
    </SettingsErrorBoundary>
  );
}

function ToggleItem({ label, desc, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-3 px-1 cursor-pointer group hover:bg-white/[0.02] rounded-xl transition-all">
      <div>
        <div className="text-sm font-bold group-hover:text-cyan-300 transition-colors">{label}</div>
        <div className="text-[10px] opacity-40">{desc}</div>
      </div>
      <Toggle checked={checked} onChange={() => onChange(!checked)} />
    </label>
  );
}

function Toggle({ checked, onChange, small }) {
  return (
    <div
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(!checked); }}
      className={`${small ? 'w-8 h-4.5' : 'w-11 h-6'} rounded-full relative transition-all duration-300 cursor-pointer overflow-hidden ${checked ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'bg-black/40 border border-white/10 shadow-inner'}`}
    >
      <div className={`absolute top-0.5 ${checked ? (small ? 'left-4' : 'left-5.5') : 'left-0.5'} ${small ? 'w-3.5 h-3.5' : 'w-5 h-5'} bg-white rounded-full transition-all duration-300 shadow-xl border border-black/10`} />
    </div>
  );
}
