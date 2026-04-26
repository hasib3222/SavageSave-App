import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Scheduler({ items }) {
  const [jobs, setJobs] = useState([]);
  const [downloadId, setDownloadId] = useState('');
  const [action, setAction] = useState('resume');
  const [when, setWhen] = useState('');

  const load = async () => setJobs(await api.listSchedule());
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, []);

  const add = async () => {
    if (!downloadId || !when) return;
    await api.schedule({ downloadId, action, runAt: new Date(when).getTime() });
    setWhen('');
    load();
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent">Scheduler</h1>

      <div className="glass rounded-2xl p-5 mb-4">
        <h3 className="font-medium mb-3">New schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={downloadId} onChange={(e) => setDownloadId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
            <option value="">Select download…</option>
            {items.map((d) => <option key={d.id} value={d.id}>{d.filename} ({d.status})</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
            <option value="resume">Resume / Start</option>
            <option value="pause">Pause</option>
          </select>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" />
          <button onClick={add} className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm shadow-turbo btn-turbo">
            Schedule
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-medium mb-3">Upcoming</h3>
        {jobs.length === 0 && <div className="opacity-60 text-sm">No scheduled jobs.</div>}
        <ul className="flex flex-col gap-2">
          {jobs.map((j) => {
            const d = items.find((x) => x.id === j.downloadId);
            return (
              <li key={j.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-xl opacity-60">Sch</span>
                <div className="flex-1 text-sm">
                  <div>{d ? d.filename : j.downloadId} — <span className="opacity-70">{j.action}</span></div>
                  <div className="text-xs opacity-60">{new Date(j.runAt).toLocaleString()}</div>
                </div>
                <button onClick={async () => { await api.cancelSchedule(j.id); load(); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Cancel</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
