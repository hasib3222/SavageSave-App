import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import AIAssistant from './components/AIAssistant';
import AddDownloadModal from './components/AddDownloadModal';
import Settings from './components/Settings';
import SchedulerView from './components/Scheduler';
import Notifications, { pushNotification } from './components/Notifications';
import SplashScreen from './components/SplashScreen';
import ParticleCanvas from './components/ParticleCanvas';
import AuthModal from './components/AuthModal';
import PremiumModal from './components/PremiumModal';
import AboutModal from './components/AboutModal';
import { AuthProvider } from './hooks/useAuth';
import { useDownloads } from './hooks/useDownloads';
import { api } from './api';
import { APP_NAME, APP_VERSION_LABEL, APP_DEFAULT_CHANNEL } from './config/version';

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/i;
const LS_KEY = 'savagesave-settings';

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const [view, setView] = useState('dashboard');

  // ── Mode: sigma (default) or cute ──────────────────────────────────────
  const [mode, setMode] = useState(() => localStorage.getItem('savagesave-mode') || 'sigma');

  const [modalOpen, setModalOpen] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [splashDone, setSplashDone] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY) || localStorage.getItem('savagesave-settings');
      if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultSettings();
  });

  // Live downloads
  const { downloads } = useDownloads((type, d) => {
    if (type === 'completed') {
      pushNotification({ title: mode === 'cute' ? 'Done! 🍓' : 'DOWNLOAD COMPLETE ⚡', body: d.filename });
      if (settings?.notifications) window.api?.notify({ title: 'Download complete', body: d.filename });
    } else if (type === 'failed') {
      pushNotification({ title: 'Download failed', body: `${d.filename}: ${d.error || ''}` });
    }
  });

  // Bootstrap save dir
  useEffect(() => {
    (async () => {
      if (settings?.saveDir) return;
      try {
        const { saveDir } = await api.defaults();
        setSettings((s) => ({ ...(s || defaultSettings()), saveDir }));
      } catch (_) {}
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (settings) localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply cute class to <html> when mode changes
  useEffect(() => {
    document.documentElement.classList.toggle('cute', mode === 'cute');
    localStorage.setItem('savagesave-mode', mode);
  }, [mode]);

  // About modal trigger
  useEffect(() => {
    const h = () => setAboutOpen(true);
    window.addEventListener('open-about-modal', h);
    return () => window.removeEventListener('open-about-modal', h);
  }, []);

  // Ctrl+N → new download
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setModalOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Clipboard monitor
  useEffect(() => {
    if (!settings?.clipboardMonitor) return;
    let last = '';
    const t = setInterval(async () => {
      try {
        const text = await window.api?.readClipboard?.();
        if (!text || text === last) return;
        last = text;
        const m = URL_REGEX.exec(text);
        if (m) {
          setInitialUrl(m[0]);
          setModalOpen(true);
          pushNotification({ title: mode === 'cute' ? '🔗 Link detected! ✨' : '► LINK DETECTED', body: m[0] });
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(t);
  }, [settings?.clipboardMonitor, mode]);

  const items = useMemo(() =>
    Object.values(downloads).sort((a, b) => (a.filename || '').localeCompare(b.filename || '')),
    [downloads]
  );

  const counts = useMemo(() => ({
    active:    items.filter((d) => d.status !== 'completed' && d.status !== 'canceled').length,
    completed: items.filter((d) => d.status === 'completed').length,
  }), [items]);

  const isCute = mode === 'cute';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Particle layer (z-1, pointer-events-none) */}
      {splashDone && <ParticleCanvas mode={mode} />}

      <div className="flex-1 flex min-h-0 relative z-10">
        <Sidebar
          view={view} setView={setView}
          counts={counts}
          mode={mode} setMode={setMode}
          onOpenPremium={() => setPremiumOpen(true)}
        />

        <main className="flex-1 flex min-w-0">
          {view === 'dashboard' && <Dashboard items={items} filter="active"    onAdd={() => setModalOpen(true)} mode={mode} />}
          {view === 'completed' && <Dashboard items={items} filter="completed" onAdd={() => setModalOpen(true)} mode={mode} />}
          {view === 'scheduler' && <SchedulerView items={items} />}
          {view === 'settings'  && <Settings settings={settings || defaultSettings()} setSettings={setSettings} />}
        </main>

        <AIAssistant items={items} onNewDownload={() => setModalOpen(true)} />
      </div>

      <Terminal items={items} defaultDir={settings?.saveDir} setTheme={() => {}} onAdd={() => {}} />

      <AddDownloadModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setInitialUrl(''); }}
        initialUrl={initialUrl}
        defaultDir={settings?.saveDir}
        cookieBrowser={settings?.cookieBrowser}
      />

      <Notifications />
      <AuthModal />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} channel={settings?.releaseChannel || APP_DEFAULT_CHANNEL} />

      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {/* Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${isCute ? 'rgba(18,4,14,0.95)' : 'rgba(6,9,17,0.95)'}, transparent)`,
          fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace",
        }}
      >
        <span
          className="font-black text-[11px] tracking-widest brand-text"
        >
          {APP_NAME}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>·</span>
        <span
          className="font-mono text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {APP_VERSION_LABEL}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>·</span>
        <span
          className="font-bold text-[11px]"
          style={{ color: 'var(--brand)' }}
        >
          {isCute ? '🌸 Cute Mode' : '⚡ Sigma Mode'}
        </span>
      </div>
    </div>
  );
}

function defaultSettings() {
  return {
    saveDir: '',
    connections: 8,
    clipboardMonitor: true,
    notifications: true,
    smartAccel: true,
    cookieBrowser: '',
    releaseChannel: APP_DEFAULT_CHANNEL,
  };
}
