// API client: talks to the embedded Express backend.
// Port is passed from Electron main via ?apiPort=... query param.

const params = new URLSearchParams(window.location.search);
const port = params.get('apiPort') || '3001';
export const API_BASE = `http://127.0.0.1:${port}`;

async function j(path, opts = {}) {
  const { timeoutMs = 45000, signal: externalSignal, ...fetchOpts } = opts;
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...fetchOpts,
    });

    let body = null;
    try { body = await res.json(); } catch (_) { body = null; }

    if (!res.ok) {
      throw new Error(body?.error || body?.message || res.statusText || 'Request failed');
    }
    return body ?? {};
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Request timed out. Please retry.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

export const api = {
  list: () => j('/api/downloads'),
  defaults: () => j('/api/defaults'),
  probe: (url, cookieBrowser, opts = {}) => j('/api/probe', {
    method: 'POST',
    body: JSON.stringify({ url, cookieBrowser }),
    timeoutMs: 35000,
    ...opts,
  }),
  add: (payload) => j('/api/downloads', { method: 'POST', body: JSON.stringify(payload) }),
  pause: (id) => j(`/api/downloads/${id}/pause`, { method: 'POST' }),
  resume: (id) => j(`/api/downloads/${id}/resume`, { method: 'POST' }),
  cancel: (id) => j(`/api/downloads/${id}/cancel`, { method: 'POST' }),
  remove: (id) => j(`/api/downloads/${id}`, { method: 'DELETE' }),
  listSchedule: () => j('/api/schedule'),
  schedule: (payload) => j('/api/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  cancelSchedule: (id) => j(`/api/schedule/${id}`, { method: 'DELETE' }),
  events: () => new EventSource(`${API_BASE}/api/events`),
};
