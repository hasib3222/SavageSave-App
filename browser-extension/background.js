// SavageSave browser integration.
// Adds a right-click "Send to SavageSave" on links.
// NOTE: Because the Electron backend uses a random port, this extension
// scans common ports 3000-3999 for the /api/defaults endpoint.

const PORT_RANGE_START = 3000;
const PORT_RANGE_END = 3999;

let cachedPort = null;

async function findPort() {
  if (cachedPort) {
    try {
      const r = await fetch(`http://127.0.0.1:${cachedPort}/api/defaults`);
      if (r.ok) return cachedPort;
    } catch (_) {}
    cachedPort = null;
  }
  for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p++) {
    try {
      const r = await fetch(`http://127.0.0.1:${p}/api/defaults`, { signal: AbortSignal.timeout(200) });
      if (r.ok) { cachedPort = p; return p; }
    } catch (_) {}
  }
  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'savagesave-send-link',
    title: 'Send to SavageSave',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'savagesave-send-link' || !info.linkUrl) return;
  const port = await findPort();
  if (!port) {
    chrome.notifications.create({ type: 'basic', title: 'SavageSave', message: 'App not running', iconUrl: 'icon.png' });
    return;
  }
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: info.linkUrl }),
    });
    const d = await r.json();
    chrome.notifications.create({ type: 'basic', title: 'SavageSave', message: 'Queued: ' + (d.filename || info.linkUrl), iconUrl: 'icon.png' });
  } catch (e) {
    chrome.notifications.create({ type: 'basic', title: 'SavageSave error', message: String(e), iconUrl: 'icon.png' });
  }
});
