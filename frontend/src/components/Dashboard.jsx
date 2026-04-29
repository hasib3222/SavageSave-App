import React, { useMemo, useState } from 'react';
import DownloadCard from './DownloadCard';
import AdBanner from '../ads/AdBanner';
import { fmtBytes, fmtSpeed } from '../utils';

const CATS = ['all', 'video', 'audio', 'image', 'document', 'archive', 'software', 'other'];

export default function Dashboard({ items, onAdd, filter = 'active', mode = 'sigma' }) {
  const [cat, setCat] = useState('all');
  const isCute = mode === 'cute';

  const filtered = useMemo(() => {
    let arr = items;
    if (filter === 'active')    arr = arr.filter((d) => d.status !== 'completed');
    if (filter === 'completed') arr = arr.filter((d) => d.status === 'completed');
    if (cat !== 'all')          arr = arr.filter((d) => d.category === cat);
    return arr;
  }, [items, filter, cat]);

  const totalSpeed  = items.filter((d) => d.status === 'downloading').reduce((s, d) => s + (d.speed || 0), 0);
  const totalDl     = items.reduce((s, d) => s + (d.downloaded || 0), 0);
  const activeCount = items.filter((d) => d.status === 'downloading').length;

  const stats = isCute
    ? [
        { label: 'Active',      value: activeCount,         icon: '🍓', col: '#ff69b4' },
        { label: 'Downloaded',  value: fmtBytes(totalDl),   icon: '💾', col: '#c084fc' },
        { label: 'Speed',       value: fmtSpeed(totalSpeed), icon: '✨', col: '#fb7185' },
        { label: 'Queue',       value: items.length,         icon: '📋', col: '#f9a8d4' },
      ]
    : [
        { label: 'ACTIVE',      value: activeCount,         icon: '⬇', col: '#00f5ff' },
        { label: 'DOWNLOADED',  value: fmtBytes(totalDl),   icon: '💾', col: '#3b82f6' },
        { label: 'SPEED',       value: fmtSpeed(totalSpeed), icon: '⚡', col: '#7c3aed' },
        { label: 'QUEUE',       value: items.length,         icon: '◈', col: '#00f5ff' },
      ];

  return (
    <div
      className="flex-1 overflow-auto p-4 relative z-10"
      style={{ fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace" }}
    >
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div
        className="glass grid-bg rounded-3xl p-6 mb-4 relative overflow-hidden scanline"
        style={{ borderRadius: 'var(--card-radius)' }}
      >
        {/* Decorative BG glow */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, var(--brand), transparent 70%)`, opacity: 0.12 }}
        />

        {isCute ? (
          /* ── CUTE HERO ────────────────────────────────────────────── */
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌸</span>
              <span className="text-[11px] font-black tracking-[0.3em]" style={{ color: 'var(--brand)' }}>
                SAVAGESAVE CUTE MODE
              </span>
              <span className="text-2xl">🌸</span>
            </div>
            <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {filter === 'completed' ? (
                <><span className="cute-text">Completed</span> ✨</>
              ) : (
                <><span className="cute-text">Downloads</span> 🍓</>
              )}
            </h1>
            <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
              Stay sweet · Keep downloading · You're doing amazing 💕
            </p>
            {/* Floating deco */}
            {['🍓','💕','✨','🌸'].map((e, i) => (
              <span
                key={i}
                className="cute-deco"
                style={{
                  left: `${15 + i * 22}%`,
                  top: `${10 + (i % 2) * 30}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${3 + i * 0.5}s`,
                }}
              >{e}</span>
            ))}
          </div>
        ) : (
          /* ── SIGMA HERO ───────────────────────────────────────────── */
          <div className="relative">
            <div
              className="text-[10px] font-black tracking-[0.5em] mb-1"
              style={{ color: 'var(--brand)', fontFamily: "'Share Tech Mono',monospace" }}
            >
              SAVAGESAVE // {filter === 'completed' ? 'VAULT' : 'CONTROL CENTER'}
            </div>
            <h1
              className="text-4xl font-black tracking-tight glitch"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="sigma-text">
                {filter === 'completed' ? 'POWER VAULT' : 'DOWNLOADS'}
              </span>
            </h1>
            <p
              className="text-xs font-bold tracking-widest mt-1"
              style={{ color: 'var(--text-muted)', fontFamily: "'Share Tech Mono',monospace" }}
            >
              CONTROL. SPEED. DOMINATE. · MULTI-THREAD · LIVE TELEMETRY
            </p>
          </div>
        )}

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} isCute={isCute} />
          ))}
        </div>

        {/* New Download button — right-aligned overlay */}
        <button
          onClick={onAdd}
          className="btn-savage absolute top-5 right-5 px-4 py-2.5 text-sm font-black flex items-center gap-2"
          style={{ borderRadius: 'var(--card-radius-sm)', boxShadow: 'var(--btn-shadow)' }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          {isCute ? 'New Download 🍓' : 'NEW DOWNLOAD ⚡'}
        </button>
      </div>

      {/* ── Category chips ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="text-xs px-3 py-1.5 font-bold capitalize transition-all"
            style={{
              borderRadius: 999,
              background: cat === c ? 'var(--btn-grad)' : 'var(--bg-card)',
              border: `1px solid ${cat === c ? 'var(--border-active)' : 'var(--border)'}`,
              color: cat === c ? '#fff' : 'var(--text-muted)',
              boxShadow: cat === c ? 'var(--glow-sm)' : 'none',
              transition: 'var(--t)',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── Download list ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div
            className="glass rounded-3xl p-12 text-center"
            style={{ borderRadius: 'var(--card-radius)', animation: 'fadeUp 0.4s ease-out' }}
          >
            <img
              src="icon/main icon s.png"
              alt="SavageSave"
              className="mx-auto mb-4 w-24 h-24 rounded-2xl object-cover"
              draggable={false}
            />
            <div className="font-black text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              {isCute ? 'Nothing here yet! ✨' : 'QUEUE EMPTY // READY'}
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              {isCute
                ? 'Click New Download and start something sweet 🌸'
                : 'INITIATE DOWNLOAD SEQUENCE → click NEW DOWNLOAD'}
            </div>
          </div>
        )}
        {filtered.map((d, i) => (
          <div key={d.id || i} style={{ animation: `fadeUp 0.38s ease-out ${i * 0.045}s both` }}>
            <DownloadCard d={d} mode={mode} />
          </div>
        ))}
      </div>

      <AdBanner />
    </div>
  );
}

function StatCard({ label, value, icon, col, isCute }) {
  return (
    <div
      className="rounded-2xl p-3 relative overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--card-radius-sm)',
        transition: 'var(--t)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(circle at 80% 20%, ${col}22, transparent 70%)` }}
      />
      <div className="text-xl mb-1">{icon}</div>
      <div
        className="text-2xl font-black"
        style={{ color: 'var(--text-primary)', fontFamily: isCute ? "'Nunito',sans-serif" : "'Rajdhani',monospace" }}
      >
        {value}
      </div>
      <div
        className="text-[10px] font-bold tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
    </div>
  );
}
