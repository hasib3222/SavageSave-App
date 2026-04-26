import React, { useMemo } from 'react';
import AppIcon from './AppIcon';
import { api } from '../api';

// Rule-based "AI" assistant. It inspects download state and surfaces
// helpful, actionable suggestions. No external calls — fully local.
export default function AIAssistant({ items, onNewDownload }) {
  const suggestions = useMemo(() => buildSuggestions(items), [items]);

  return (
    <div className="w-80 shrink-0 p-4 flex flex-col gap-3">
      <div className="glass rounded-2xl p-4 relative scanline">
        <div className="flex items-center gap-2">
          <AppIcon src="/icon/ai assistent.png" size={36} className="rounded-xl shadow-turbo animate-glow" />
          <div>
            <div className="text-sm font-medium">AI Assistant</div>
            <div className="text-[11px] opacity-60">Smart suggestions</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-auto">
        {suggestions.length === 0 && (
          <div className="glass rounded-2xl p-4 text-sm opacity-70">
            Everything looks good — No action needed right now.
          </div>
        )}
        {suggestions.map((s, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-sm">
            <div className="flex items-center gap-2 mb-1">
              {s.icon && <span className="text-lg">{s.icon}</span>}
              <div className="font-medium">{s.title}</div>
            </div>
            <div className="opacity-80 text-[12.5px]">{s.body}</div>
            {s.action && (
              <button
                onClick={s.action.run}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/30 to-violet-500/30 hover:brightness-125 border border-white/10"
              >
                {s.action.label}
              </button>
            )}
          </div>
        ))}

        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-widest opacity-60 mb-2">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onNewDownload} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">+ Add URL</button>
            <button onClick={() => items.filter(d => d.status === 'paused').forEach(d => api.resume(d.id))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">Resume all</button>
            <button onClick={() => items.filter(d => d.status === 'downloading').forEach(d => api.pause(d.id))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">Pause all</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildSuggestions(items) {
  const out = [];
  const failed = items.filter((d) => d.status === 'error');
  const paused = items.filter((d) => d.status === 'paused');
  const slow = items.filter((d) => d.status === 'downloading' && d.speed > 0 && d.speed < 100 * 1024);
  const lowConn = items.filter((d) => d.status === 'downloading' && d.connections <= 2 && d.totalSize > 50 * 1024 * 1024);
  const noRange = items.filter((d) => d.status === 'downloading' && d.segments && d.segments.length === 1 && d.totalSize > 20 * 1024 * 1024);

  if (failed.length) {
    out.push({
      icon: null,
      title: `Retry ${failed.length} failed download${failed.length > 1 ? 's' : ''}`,
      body: 'Some downloads ran into errors. I can retry them with the same settings.',
      action: { label: 'Resume failed', run: () => failed.forEach((d) => api.resume(d.id)) },
    });
  }
  if (paused.length) {
    out.push({
      icon: null,
      title: `${paused.length} paused download${paused.length > 1 ? 's' : ''}`,
      body: 'Hit resume whenever your network is ready.',
      action: { label: 'Resume all paused', run: () => paused.forEach((d) => api.resume(d.id)) },
    });
  }
  if (slow.length) {
    out.push({
      icon: null,
      title: 'Speed seems low',
      body: 'Consider increasing connections or checking your network. The smart accelerator will also tune chunk sizes automatically.',
    });
  }
  if (lowConn.length) {
    out.push({
      icon: null,
      title: 'Try more connections',
      body: 'Large files benefit from 8–16 parallel connections on servers that support HTTP Range.',
    });
  }
  if (noRange.length) {
    out.push({
      icon: null,
      title: 'Server does not support ranges',
      body: 'This download is single-stream. Resume after interruption may not be possible.',
    });
  }
  return out;
}
