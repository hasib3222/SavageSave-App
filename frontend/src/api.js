// API client: talks to the embedded Express backend.
// Port is passed from Electron main via ?apiPort=... query param.

const params = new URLSearchParams(window.location.search);
const port = params.get('apiPort') || '3001';
export const API_BASE = `http://127.0.0.1:${port}`;

async function j(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

export const api = {
  list: () => j('/api/downloads'),
  defaults: () => j('/api/defaults'),
  probe: (url, cookieBrowser) => j('/api/probe', { method: 'POST', body: JSON.stringify({ url, cookieBrowser }) }),
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
