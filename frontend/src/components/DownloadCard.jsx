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

  const statusColor = isDone  ? '#34d399'
                    : isError ? '#f87171'
                    : isPost  ? 'var(--brand2)'
                    : d.status === 'paused' ? '#fbbf24'
                    : 'var(--brand)';

  return (
    <div
      className="glass relative overflow-hidden group"
      style={{
        borderRadius: 'var(--card-radius)',
        padding: isCute ? '14px 16px' : '12px 16px',
        transition: 'var(--t)',
        fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace",
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: 2,
          background: isDone
            ? 'linear-gradient(90deg,#34d399,#10b981)'
            : isError
            ? 'linear-gradient(90deg,#f87171,#ef4444)'
            : 'linear-gradient(90deg,var(--prog-a),var(--prog-b),var(--prog-c))',
          opacity: 0.9,
        }}
      />

      {/* Hover ambient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 0%, var(--prog-glow), transparent)`,
          borderRadius: 'inherit',
          opacity: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
      />

      <div className="flex items-center gap-3 relative">
        {/* ── File type badge ─────────────────────────────────────────── */}
        <div
          className="w-12 h-12 rounded-xl shrink-0 grid place-items-center font-black uppercase text-xs"
          style={{
            background: isCute ? 'rgba(255,105,180,0.12)' : 'rgba(0,245,255,0.08)',
            border: `1px solid ${isCute ? 'rgba(255,105,180,0.30)' : 'rgba(0,245,255,0.25)'}`,
            color: isCute ? '#ff69b4' : '#00f5ff',
            letterSpacing: '0.05em',
            fontSize: 10,
            fontWeight: 800,
            boxShadow: isCute ? '0 0 10px rgba(255,105,180,0.20)' : '0 0 10px rgba(0,245,255,0.18)',
            borderRadius: 'var(--card-radius-sm)',
          }}
        >
          {isCute ? (
            // Cute: emoji icon based on type
            { mp4:'🎬', mp3:'🎵', jpg:'🖼', png:'🖼', pdf:'📄', zip:'📦', exe:'⚙', webm:'🎬' }[ext] || '📁'
          ) : (
            ext.toUpperCase()
          )}
        </div>

        {/* ── Info ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title + status */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className="truncate text-sm font-black"
              style={{ color: 'var(--text-primary)', letterSpacing: isCute ? '0' : '0.01em' }}
            >
              {d.filename || (isCute ? 'Loading… 🌸' : 'LOADING...')}
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 uppercase tracking-wide"
              style={{
                background: `${statusColor}18`,
                color: statusColor,
                border: `1px solid ${statusColor}40`,
                borderRadius: 999,
              }}
            >
              {isCute ? statusLabel(d).replace('...','…') : statusLabel(d).toUpperCase()}
            </span>
          </div>

          {/* URL */}
          <div
            className="text-[11px] truncate mb-2 font-semibold"
            style={{ color: 'var(--text-muted)', fontFamily: isCute ? 'inherit' : "'Share Tech Mono',monospace" }}
          >
            {d.url}
          </div>

          {/* ── Progress bar ─────────────────────────────────────────── */}
          <div className="progress-track" style={{ height: isCute ? 8 : 5 }}>
            {isPost ? (
              <div
                style={{
                  width: '60%',
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg,var(--prog-a),var(--prog-b),var(--prog-c))',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.2s linear infinite',
                  boxShadow: '0 0 16px var(--prog-glow)',
                }}
              />
            ) : (
              <div className="progress-fill" style={{ width: `${pct}%`, height: '100%' }} />
            )}
          </div>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            {!isPost && !isDone && (
              <span style={{ color: 'var(--brand)' }}>{pct.toFixed(1)}%</span>
            )}
            {!isPost && (
              <span>{fmtBytes(d.downloaded)} / {fmtBytes(d.totalSize)}</span>
            )}
            {d.status === 'downloading' && !isPost && d.speed > 0 && (
              <span
                style={{ color: 'var(--brand)', fontFamily: isCute ? 'inherit' : "'Share Tech Mono',monospace" }}
              >
                {fmtSpeed(d.speed)}
              </span>
            )}
            {d.status === 'downloading' && !isPost && d.eta > 0 && (
              <span>ETA {fmtEta(d.eta)}</span>
            )}
            {isPost && (
              <span
                className="font-black animate-pulse"
                style={{ color: 'var(--brand2)' }}
              >
                {isCute ? 'Processing ✨' : 'PROCESSING...'}
              </span>
            )}
            {isDone && (
              <span className="font-black text-emerald-400">
                {isCute ? `✓ Done! ${fmtBytes(d.totalSize)} 💕` : `✓ ${fmtBytes(d.totalSize)}`}
              </span>
            )}
            {isError && d.error && (
              <span className="text-rose-400 truncate max-w-[220px]" title={d.error}>
                {d.error.length > 60 ? d.error.slice(0, 60) + '…' : d.error}
              </span>
            )}
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 shrink-0">
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
