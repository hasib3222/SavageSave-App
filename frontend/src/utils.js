// Shared small helpers
export function fmtBytes(n = 0) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}
export function fmtSpeed(n = 0) { return `${fmtBytes(n)}/s`; }
export function fmtEta(s = 0) {
  if (!s || !isFinite(s)) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}
export const CATEGORY_COLORS = {
  video: 'from-pink-500 to-violet-500',
  audio: 'from-emerald-400 to-cyan-400',
  image: 'from-amber-400 to-pink-400',
  document: 'from-sky-400 to-blue-500',
  archive: 'from-orange-400 to-red-400',
  software: 'from-violet-400 to-fuchsia-500',
  other: 'from-slate-400 to-slate-500',
};
