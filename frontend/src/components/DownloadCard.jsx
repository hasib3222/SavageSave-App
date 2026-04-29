import React from 'react';
import { fmtBytes, fmtSpeed, fmtEta } from '../utils';
import { api } from '../api';

const POST_STAGES = new Set(['Processing...', 'Finalizing...', 'Validating...', 'Converting...']);

const statusLabel = (d) => {
  if (d.stage && d.stage !== 'Queued') return d.stage;
  if (d.status === 'downloading') return 'Downloading...';
  if (d.status === 'completed')   return 'Completed';
  return d.status;
};

export default function DownloadCard({ d, mode = 'sigma' }) {
  if (!d) return null;
  const isCute = mode === 'cute';
  const pct = Math.max(0, Math.min(1, d.progress || 0)) * 100;
  const isPost  = POST_STAGES.has(d.stage);
  const isDone  = d.status === 'completed';
  const isError = d.status === 'error';

  const ext = (d.filename || '').split('.').pop()?.toLowerCase() || '?';

  const statusColor = isDone  ? '#10b981'
                    : isError ? '#ef4444'
                    : isPost  ? 'var(--brand2)'
                    : d.status === 'paused' ? '#f59e0b'
                    : 'var(--brand)';

  return (
    <div
      className="glass relative overflow-hidden group transition-all duration-300 hover:translate-x-1"
      style={{
        borderRadius: 'var(--card-radius)',
        padding: isCute ? '16px 20px' : '14px 20px',
        fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace",
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0 transition-all duration-300"
        style={{
          height: 3,
          background: isDone
            ? 'linear-gradient(90deg,#10b981,#059669)'
            : isError
            ? 'linear-gradient(90deg,#ef4444,#dc2626)'
            : 'linear-gradient(90deg,var(--prog-a),var(--prog-b),var(--prog-c))',
          opacity: 0.8,
        }}
      />

      {/* Hover ambient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at center, var(--prog-glow), transparent 70%)`,
          borderRadius: 'inherit',
        }}
      />

      <div className="flex items-center gap-4 relative">
        {/* ── File type badge ─────────────────────────────────────────── */}
        <div
          className="w-14 h-14 rounded-2xl shrink-0 grid place-items-center font-black uppercase text-xs shadow-lg transition-transform duration-300 group-hover:scale-110"
          style={{
            background: isCute ? 'rgba(255,105,180,0.1)' : 'rgba(0,245,255,0.06)',
            border: `1px solid ${isCute ? 'rgba(255,105,180,0.2)' : 'rgba(0,245,255,0.15)'}`,
            color: isCute ? '#ff69b4' : '#00f5ff',
            letterSpacing: '0.05em',
            fontSize: 11,
            fontWeight: 900,
            borderRadius: 'var(--card-radius-sm)',
          }}
        >
          {isCute ? (
            { mp4:'🎬', mkv:'🎬', webm:'🎬', mp3:'🎵', wav:'🎵', flac:'🎵', jpg:'🖼', png:'🖼', gif:'🖼', pdf:'📄', doc:'📄', docx:'📄', zip:'📦', rar:'📦', exe:'⚙', msi:'⚙' }[ext] || '📁'
          ) : (
            ext.length > 4 ? ext.slice(0, 3) + '..' : ext.toUpperCase()
          )}
        </div>

        {/* ── Info ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="truncate text-[15px] font-black tracking-tight flex-1"
              style={{ color: 'var(--text-primary)' }}
              title={d.filename}
            >
              {d.filename || (isCute ? 'Loading… 🌸' : 'LOADING...')}
            </div>
            <span
              className="text-[9px] px-2.5 py-1 rounded-lg font-black shrink-0 uppercase tracking-widest border shadow-sm transition-all duration-300"
              style={{
                background: `${statusColor}10`,
                color: statusColor,
                borderColor: `${statusColor}30`,
              }}
            >
              {isCute ? statusLabel(d).replace('...','…') : statusLabel(d).toUpperCase()}
            </span>
          </div>

          {/* ── Progress bar ─────────────────────────────────────────── */}
          <div className="progress-track mb-2" style={{ height: isCute ? 8 : 6, background: 'rgba(255,255,255,0.04)' }}>
            {isPost ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg,var(--prog-a),var(--prog-b),var(--prog-c))',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s linear infinite',
                  opacity: 0.6,
                }}
              />
            ) : (
              <div className="progress-fill" style={{ width: `${pct}%`, height: '100%' }} />
            )}
          </div>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            {!isPost && !isDone && (
              <span className="text-cyan-400 opacity-90">{pct.toFixed(1)}%</span>
            )}
            {!isPost && (
              <span className="opacity-80 font-mono tracking-tighter">{fmtBytes(d.downloaded)} <span className="opacity-30">/</span> {fmtBytes(d.totalSize)}</span>
            )}
            {d.status === 'downloading' && !isPost && d.speed > 0 && (
              <span
                className="font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                style={{ color: 'var(--brand)' }}
              >
                {fmtSpeed(d.speed)}
              </span>
            )}
            {d.status === 'downloading' && !isPost && d.eta > 0 && (
              <span className="opacity-80">ETA {fmtEta(d.eta)}</span>
            )}
            {isPost && (
              <span
                className="font-black animate-pulse uppercase tracking-wider"
                style={{ color: 'var(--brand2)' }}
              >
                {isCute ? 'Processing ✨' : 'Processing...'}
              </span>
            )}
            {isDone && (
              <span className="font-black text-emerald-400 flex items-center gap-1.5">
                <span className="text-xs">✓</span> {isCute ? `Saved! ${fmtBytes(d.totalSize)}` : `COMPLETE [${fmtBytes(d.totalSize)}]`}
              </span>
            )}
            {isError && d.error && (
              <span className="text-rose-400 truncate max-w-[200px] border-b border-rose-400/20" title={d.error}>
                {d.error}
              </span>
            )}
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5 shrink-0 ml-2">
          {(d.status === 'paused' || d.status === 'error') && (
            <ActionBtn onClick={() => api.resume(d.id)} title="Resume" isCute={isCute}>
              {isCute ? '▶' : '►'}
            </ActionBtn>
          )}
          {d.status !== 'completed' && d.status !== 'canceled' && (
            <ActionBtn onClick={() => api.cancel(d.id)} title="Cancel" danger isCute={isCute}>
              {isCute ? '✕' : '■'}
            </ActionBtn>
          )}
          {isDone && (
            <>
              <ActionBtn onClick={() => window.api?.openPath(d.filePath)}   title="Open file" isCute={isCute}>
                {isCute ? '↗' : '▸'}
              </ActionBtn>
              <ActionBtn onClick={() => window.api?.showInFolder(d.filePath)} title="Show folder" isCute={isCute}>
                {isCute ? '📁' : '◫'}
              </ActionBtn>
            </>
          )}
          <ActionBtn onClick={() => api.remove(d.id)} title="Remove" isCute={isCute}>
            {isCute ? '🗑' : '✕'}
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, children, danger, isCute }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-8 h-8 grid place-items-center text-sm font-black transition-all"
      style={{
        borderRadius: 'var(--card-radius-sm)',
        background: danger
          ? (hovered ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.08)')
          : (hovered ? 'var(--bg-hover)' : 'var(--bg-card)'),
        border: `1px solid ${danger ? (hovered ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.20)') : (hovered ? 'var(--border-active)' : 'var(--border)')}`,
        color: danger ? (hovered ? '#fca5a5' : '#f87171') : (hovered ? 'var(--text-accent)' : 'var(--text-muted)'),
        boxShadow: hovered ? (danger ? '0 0 12px rgba(239,68,68,0.30)' : 'var(--glow-sm)') : 'none',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 150ms ease',
      }}
    >
      {children}
    </button>
  );
}
