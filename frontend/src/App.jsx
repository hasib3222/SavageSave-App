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
import AuthModal from './components/AuthModal';
import PremiumModal from './components/PremiumModal';
import AboutModal from './components/AboutModal';
import { AuthProvider } from './hooks/useAuth';
import { useDownloads } from './hooks/useDownloads';
import { api } from './api';
import { APP_NAME, APP_VERSION_LABEL, APP_DEFAULT_CHANNEL } from './config/version';

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/i;
const LS_KEY = 'turbonest-settings';

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const [view, setView] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [modalOpen, setModalOpen] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [splashDone, setSplashDone] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultSettings();
  });

  // Live downloads + toast on completion/failure
  const { downloads } = useDownloads((type, d) => {
    if (type === 'completed') {
      pushNotification({ title: 'Download complete', body: d.filename });
      if (settings?.notifications) window.api?.notify({ title: 'Download complete', body: d.filename });
    } else if (type === 'failed') {
      pushNotification({ title: 'Download failed', body: `${d.filename}: ${d.error || ''}` });
    }
  });

  // Bootstrap default settings with backend default save dir
  useEffect(() => {
    (async () => {
      if (settings && settings.saveDir) return;
      try {
        const { saveDir } = await api.defaults();
        setSettings((s) => ({ ...(s || defaultSettings()), saveDir }));
      } catch (_) {}
    })();
  }, []); // eslint-disable-line

  // Persist settings
  useEffect(() => {
    if (settings) localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Listen for About modal trigger from Settings
  useEffect(() => {
    const handler = () => setAboutOpen(true);
    window.addEventListener('open-about-modal', handler);
    return () => window.removeEventListener('open-about-modal', handler);
  }, []);

  // Global shortcut: Ctrl+`
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Clipboard monitoring (polls Electron clipboard every 1.5s)
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
          pushNotification({ title: 'Link detected in clipboard', body: m[0] });
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(t);
  }, [settings?.clipboardMonitor]);

  const items = useMemo(() => Object.values(downloads)
    .sort((a, b) => (a.filename || '').localeCompare(b.filename || '')), [downloads]);

  const counts = useMemo(() => ({
    active: items.filter((d) => d.status !== 'completed' && d.status !== 'canceled').length,
    completed: items.filter((d) => d.status === 'completed').length,
  }), [items]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex-1 flex min-h-0">
        <Sidebar view={view} setView={setView} counts={counts} theme={theme} setTheme={setTheme} onOpenPremium={() => setPremiumOpen(true)} />

        <main className="flex-1 flex min-w-0">
          {view === 'dashboard' && <Dashboard items={items} filter="active" onAdd={() => setModalOpen(true)} />}
          {view === 'completed' && <Dashboard items={items} filter="completed" onAdd={() => setModalOpen(true)} />}
          {view === 'scheduler' && <SchedulerView items={items} />}
          {view === 'settings' && <Settings settings={settings || defaultSettings()} setSettings={setSettings} />}
        </main>

        <AIAssistant items={items} onNewDownload={() => setModalOpen(true)} />
      </div>

      <Terminal
        items={items}
        defaultDir={settings?.saveDir}
        setTheme={setTheme}
        onAdd={() => {}}
      />

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

      {/* Footer with version */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5 bg-gradient-to-t from-slate-950/90 to-transparent text-[11px] text-slate-500/80 font-mono tracking-wide pointer-events-none">
        <span className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 bg-clip-text text-transparent">{APP_NAME}</span>
        <span className="text-slate-600">·</span>
        <span>{APP_VERSION_LABEL}</span>
        <span className="text-slate-600">·</span>
        <span className="text-cyan-500/70">{settings?.releaseChannel || APP_DEFAULT_CHANNEL}</span>
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
