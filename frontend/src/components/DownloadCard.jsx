import React from 'react';
import { fmtBytes, fmtSpeed, fmtEta, CATEGORY_COLORS } from '../utils';
import { api } from '../api';
import AppIcon from './AppIcon';

const statusBadge = {
  downloading: 'bg-cyan-500/20 text-cyan-300',
  paused: 'bg-amber-500/20 text-amber-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  error: 'bg-rose-500/20 text-rose-300',
  canceled: 'bg-slate-500/20 text-slate-300',
  queued: 'bg-violet-500/20 text-violet-300',
};

export default function DownloadCard({ d }) {
  if (!d) return null;
  const pct = Math.max(0, Math.min(1, d.progress || 0)) * 100;
  const grad = CATEGORY_COLORS[d.category] || CATEGORY_COLORS.other;

  const openFolder = () => window.api?.showInFolder(d.filePath);
  const openFile = () => window.api?.openPath(d.filePath);

  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden" style={{ animation: 'fadeUp 0.4s ease-out forwards' }}>
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${grad}`} />
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 shrink-0 rounded-xl grid place-items-center transition-transform duration-200 hover:scale-[1.04]">
          <AppIcon src="/icon/file icon.png" size={44} className="drop-shadow-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium">{d.filename}</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider status-badge ${statusBadge[d.status] || ''}`}>
              {d.status}
            </span>
          </div>
          <div className="text-[11px] opacity-60 truncate mt-0.5">{d.url}</div>

          {/* Segmented bar */}
          <div className="mt-3 progress-track h-2">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>

          {/* Connection dots */}
          {d.segments && d.segments.length > 1 && (
            <div className="mt-2 flex gap-1">
              {d.segments.map((s, i) => {
                const p = s.end > s.start ? s.downloaded / (s.end - s.start + 1) : 0;
                return (
                  <div key={i} className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                      style={{ width: `${Math.min(1, p) * 100}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-80">
            <span>{pct.toFixed(1)}%</span>
            <span>{fmtBytes(d.downloaded)} / {fmtBytes(d.totalSize)}</span>
            {d.status === 'downloading' && <span className="text-cyan-300">{fmtSpeed(d.speed)}</span>}
            {d.status === 'downloading' && <span>ETA {fmtEta(d.eta)}</span>}
            <span className="opacity-50">· {d.connections} conn</span>
            {d.error && <span className="text-rose-300 truncate max-w-[200px] inline-block" title={d.error}>{d.error.length > 60 ? d.error.substring(0, 60) + '...' : d.error}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {d.status === 'downloading' && (
            <button onClick={() => api.pause(d.id)} className="btn" title="Pause">||</button>
          )}
          {(d.status === 'paused' || d.status === 'error') && (
            <button onClick={() => api.resume(d.id)} className="btn" title="Resume">&#9654;</button>
          )}
          {d.status !== 'completed' && d.status !== 'canceled' && (
            <button onClick={() => api.cancel(d.id)} className="btn" title="Cancel">&#10005;</button>
          )}
          {d.status === 'completed' && (
            <>
              <button onClick={openFile} className="btn" title="Open">Open</button>
              <button onClick={openFolder} className="btn" title="Show in folder">Folder</button>
            </>
          )}
          <button onClick={() => api.remove(d.id)} className="btn" title="Remove">Del</button>
        </div>
      </div>

      <style>{`
        .btn {
          width: 32px; height: 32px; border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          display: grid; place-items: center;
          transition: all .15s ease;
          font-size: 13px;
        }
        .btn:hover { background: rgba(255,255,255,0.12); box-shadow: 0 0 14px rgba(167,139,250,0.4); }
      `}</style>
    </div>
  );
}

