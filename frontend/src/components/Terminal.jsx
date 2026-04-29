import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { APP_VERSION_LABEL } from '../config/version';

// In-app terminal. Supports commands:
//   help
//   download <url> [connections]
//   pause <id|name>
//   resume <id|name>
//   cancel <id|name>
//   remove <id|name>
//   list
//   clear
//   theme <dark|light>
//   open <id|name>
export default function Terminal({ items, onAdd, setTheme, defaultDir }) {
  const [lines, setLines] = useState([
    { t: 'sys', v: `SavageSave Console ${APP_VERSION_LABEL} — type \`help\` for commands` },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hIdx, setHIdx] = useState(-1);
  const [open, setOpen] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines, open]);

  const push = (t, v) => setLines((ls) => [...ls, { t, v }]);

  const findItem = (arg) => items.find((d) => d.id === arg || d.filename === arg)
    || items.find((d) => d.id.startsWith(arg) || d.filename.startsWith(arg));

  const run = async (cmd) => {
    const [c, ...rest] = cmd.trim().split(/\s+/);
    if (!c) return;
    push('in', '> ' + cmd);
    try {
      switch (c.toLowerCase()) {
        case 'help':
          push('out', [
            'help                      — show this help',
            'download <url> [n]        — start download (n = connections)',
            'list                      — list downloads',
            'pause <id|name>           — pause',
            'resume <id|name>          — resume',
            'cancel <id|name>          — cancel',
            'remove <id|name>          — remove from list',
            'open <id|name>            — open completed file',
            'theme <dark|light>        — toggle theme',
            'clear                     — clear screen',
          ].join('\n'));
          break;
        case 'download': {
          const url = rest[0];
          const n = rest[1] ? Number(rest[1]) : 8;
          if (!url) throw new Error('usage: download <url> [connections]');
          const r = await api.add({ url, saveDir: defaultDir, connections: n });
          push('ok', `started ${r.id} → ${r.filename || '(resolving)'}`);
          onAdd && onAdd();
          break;
        }
        case 'list':
          if (!items.length) push('out', '(empty)');
          else push('out', items.map((d) =>
            `${d.id.slice(0, 6)}  ${d.status.padEnd(11)} ${(d.progress * 100).toFixed(1).padStart(5)}%  ${d.filename}`
          ).join('\n'));
          break;
        case 'pause': { const it = findItem(rest[0]); if (!it) throw new Error('not found'); await api.pause(it.id); push('ok', 'paused'); break; }
        case 'resume': { const it = findItem(rest[0]); if (!it) throw new Error('not found'); await api.resume(it.id); push('ok', 'resumed'); break; }
        case 'cancel': { const it = findItem(rest[0]); if (!it) throw new Error('not found'); await api.cancel(it.id); push('ok', 'canceled'); break; }
        case 'remove': { const it = findItem(rest[0]); if (!it) throw new Error('not found'); await api.remove(it.id); push('ok', 'removed'); break; }
        case 'open': { const it = findItem(rest[0]); if (!it) throw new Error('not found');
          window.api?.openPath(it.filePath); push('ok', 'opened'); break; }
        case 'theme': setTheme(rest[0] === 'light' ? 'light' : 'dark'); push('ok', 'theme ' + rest[0]); break;
        case 'clear': setLines([]); break;
        default: throw new Error('unknown command: ' + c);
      }
    } catch (e) {
      push('err', 'error: ' + e.message);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setHistory((h) => [...h, input]);
    setHIdx(-1);
    run(input);
    setInput('');
  };

  const keyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(idx); setInput(history[idx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = hIdx < 0 ? -1 : hIdx + 1;
      if (idx >= history.length) { setHIdx(-1); setInput(''); }
      else { setHIdx(idx); setInput(history[idx] || ''); }
    }
  };

  return (
    <div className={`glass rounded-2xl mx-4 mb-4 overflow-hidden transition-all ${open ? 'h-56' : 'h-10'}`}>
      <div className="flex items-center gap-2 px-3 h-10 border-b border-white/10 text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-amber-300"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
        <span className="ml-2 opacity-70 tracking-widest">CONSOLE</span>
        <span className="ml-auto opacity-50">Ctrl+` to toggle</span>
        <button onClick={() => setOpen(!open)} className="px-2 opacity-70 hover:opacity-100">{open ? '▾' : '▴'}</button>
      </div>
      {open && (
        <div className="terminal h-[calc(100%-2.5rem)] flex flex-col">
          <div className="flex-1 overflow-auto px-3 py-2">
            {lines.map((l, i) => (
              <div key={i} className={
                l.t === 'err' ? 'text-rose-300' :
                l.t === 'ok' ? 'text-emerald-300' :
                l.t === 'in' ? 'text-cyan-300' :
                l.t === 'sys' ? 'text-violet-300' :
                'text-slate-300'}>
                <pre className="whitespace-pre-wrap">{l.v}</pre>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
            <span className="text-blue-300">savage&gt;</span>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={keyDown}
              placeholder="type `help`"
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder:text-slate-500"
            />
          </form>
        </div>
      )}
    </div>
  );
}
