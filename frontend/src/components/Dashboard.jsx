import React, { useMemo, useState } from 'react';
import DownloadCard from './DownloadCard';
import AdBanner from '../ads/AdBanner';
import AppIcon from './AppIcon';
import { fmtBytes, fmtSpeed } from '../utils';

const CATS = ['all', 'video', 'audio', 'image', 'document', 'archive', 'software', 'other'];

export default function Dashboard({ items, onAdd, filter = 'active' }) {
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => {
    let arr = items;
    if (filter === 'active') arr = arr.filter((d) => d.status !== 'completed');
    if (filter === 'completed') arr = arr.filter((d) => d.status === 'completed');
    if (cat !== 'all') arr = arr.filter((d) => d.category === cat);
    return arr;
  }, [items, filter, cat]);

  const totalSpeed = items.filter((d) => d.status === 'downloading').reduce((s, d) => s + (d.speed || 0), 0);
  const totalDl = items.reduce((s, d) => s + (d.downloaded || 0), 0);
  const activeCount = items.filter((d) => d.status === 'downloading').length;

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header cards */}
      <div className="grid-bg rounded-2xl p-6 relative overflow-hidden mb-6 glass">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs tracking-[0.35em] text-blue-300 font-semibold">TURBONEST</div>
            <h1 className="text-3xl font-bold mt-1 bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              {filter === 'completed' ? 'Completed Downloads' : 'Active Downloads'}
            </h1>
            <p className="text-sm opacity-70 mt-1">Download Smarter, Faster · Multi-connection acceleration · Live telemetry</p>
          </div>
          <button
            onClick={onAdd}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 text-white font-medium shadow-turbo btn-turbo animate-glow"
          >
            <span className="flex items-center gap-2"><AppIcon src="/icon/download icon.png" size={18} /> New Download</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Active" value={activeCount} accent="from-cyan-400 to-violet-400" />
          <Stat label="Total downloaded" value={fmtBytes(totalDl)} accent="from-blue-400 to-violet-400" />
          <Stat label="Total speed" value={fmtSpeed(totalSpeed)} accent="from-violet-400 to-cyan-400" />
          <Stat label="Queue" value={items.length} accent="from-emerald-400 to-cyan-400" />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition
              ${cat === c
                ? 'bg-white/10 border-cyan-400/50 text-cyan-200 turbo-ring'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-slate-400">
            <div className="mx-auto mb-3 w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/5 flex items-center justify-center">
              <AppIcon src="/icon/download icon.png" size={56} className="opacity-80" />
            </div>
            <div className="text-sm font-medium">Your queue is clear</div>
            <div className="text-xs opacity-70 mt-1">Click <b>+ New Download</b> or paste a link to get started.</div>
          </div>
        )}
        {filtered.map((d, i) => (
          <div key={d.id || i} style={{ animation: `fadeUp 0.4s ease-out ${i * 0.05}s forwards`, opacity: 1 }}>
            <DownloadCard d={d} />
          </div>
        ))}
      </div>

      <AdBanner />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="glass rounded-xl p-3 relative overflow-hidden">
      <div className={`absolute -inset-px -z-10 rounded-xl bg-gradient-to-br ${accent} opacity-[0.08]`} />
      <div className="text-[10px] uppercase tracking-widest opacity-60">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
