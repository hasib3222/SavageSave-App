import React, { useEffect, useRef, useState } from 'react';
import AppIcon from './AppIcon';
import { api } from '../api';

export default function AddDownloadModal({ open, onClose, initialUrl = '', defaultDir, cookieBrowser }) {
  const [url, setUrl] = useState('');
  const [dir, setDir] = useState(defaultDir || '');
  const [conns, setConns] = useState(8);
  const [filename, setFilename] = useState('');
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [probing, setProbing] = useState(false);
  const [err, setErr] = useState('');
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [retryBrowser, setRetryBrowser] = useState(''); // per-download cookie override
  const [probeState, setProbeState] = useState('idle'); // idle | loading | done | error
  const probeAbortRef = useRef(null);
  const probeSeqRef = useRef(0);

  // Detect video URLs in the UI so we can update hints live.
  const VIDEO_HOSTS_RE = /(^|\.)(youtube\.com|youtu\.be|facebook\.com|fb\.watch|instagram\.com|tiktok\.com|twitter\.com|x\.com|vimeo\.com|dailymotion\.com|twitch\.tv|reddit\.com|bilibili\.com|soundcloud\.com)$/i;
  const isVideo = (() => {
    try {
      const h = new URL(url).hostname.replace(/^www\.|^m\./, '');
      return VIDEO_HOSTS_RE.test(h);
    } catch { return false; }
  })();

  useEffect(() => {
    if (open) {
      try { probeAbortRef.current?.abort(); } catch (_) {}
      probeAbortRef.current = null;
      setUrl(initialUrl || '');
      setDir(defaultDir || '');
      setInfo(null);
      setErr('');
      setFilename('');
      setSelectedQuality(null);
      setAudioOnly(false);
      setRetryBrowser('');
      setProbeState('idle');
    }
  }, [open, initialUrl, defaultDir]);

  useEffect(() => {
    if (open) return;
    try { probeAbortRef.current?.abort(); } catch (_) {}
    probeAbortRef.current = null;
  }, [open]);

  const toProbeMessage = (raw) => {
    const msg = String(raw || '').toLowerCase();
    if (msg.includes('invalid url') || msg.includes('url') || msg.includes('unsupported')) return 'Invalid URL';
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('taking too long')) return 'Probe timeout. Please try again.';
    if (msg.includes('restricted') || msg.includes('sign into') || msg.includes('age-restricted')) return 'Restricted content';
    if (msg.includes('unavailable') || msg.includes('not available') || msg.includes('private') || msg.includes('removed')) return 'Video unavailable';
    if (msg.includes('network') || msg.includes('connection') || msg.includes('http')) return 'Network error';
    return 'Network error';
  };

  // Auto-probe for video URLs (debounced) — always clean, no cookies.
  // Also clears any previous error/info so stale restricted warnings don't persist.
  useEffect(() => {
    if (!isVideo || !url) { return; }
    setErr('');        // reset on every new URL
    setInfo(null);     // reset metadata
    setSelectedQuality(null);
    setProbeState('idle');
    const handle = setTimeout(() => { doProbe(); }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const doProbe = async (browserOverride = undefined) => {
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (_) {
      setErr('Invalid URL');
      setProbeState('error');
      setProbing(false);
      return;
    }

    try { probeAbortRef.current?.abort(); } catch (_) {}

    const seq = ++probeSeqRef.current;
    const controller = new AbortController();
    probeAbortRef.current = controller;

    setErr('');
    setProbing(true);
    setProbeState('loading');
    try {
      // Only use browser cookies when explicitly passed (e.g. user clicks retry)
      const i = await api.probe(parsedUrl.toString(), browserOverride || undefined, {
        timeoutMs: 30000,
        signal: controller.signal,
      });
      if (seq !== probeSeqRef.current) return;
      setInfo(i);
      setFilename(i.filename);
      if (i.qualities && i.qualities.length) {
        const firstVideo = i.qualities.find((q) => q.kind !== 'audio' && q.id !== 'best') || i.qualities[0];
        setSelectedQuality(firstVideo);
      }
      setProbeState('done');
    } catch (e) {
      if (seq !== probeSeqRef.current) return;
      if (String(e?.message || '').toLowerCase().includes('request canceled')) return;
      setErr(toProbeMessage(e?.message));
      setProbeState('error');
    } finally {
      if (seq !== probeSeqRef.current) return;
      setProbing(false);
    }
  };

  const pick = async () => {
    const p = await window.api?.chooseFolder();
    if (p) setDir(p);
  };

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      // Only use browser cookies if user explicitly selected a retry browser
      const useBrowser = retryBrowser || undefined;
      const payload = { url, saveDir: dir, connections: Number(conns), filename, cookieBrowser: useBrowser };
      if (isVideo && selectedQuality) {
        payload.format = selectedQuality.format;
        payload.audioOnly = audioOnly || selectedQuality.kind === 'audio';
        payload.qualityLabel = selectedQuality.label;
      }
      await api.add(payload);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Outer card: flex-col, max-height so it never overflows the window */}
      <div className="glass rounded-2xl w-[560px] max-w-[92vw] relative scanline flex flex-col"
           style={{ maxHeight: '90vh' }}>

        {/* ── Pinned header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-cyan-300 to-pink-300 bg-clip-text text-transparent">
            New Download
          </h2>
          <button onClick={onClose} className="opacity-60 hover:opacity-100">&#10005;</button>
        </div>

        {/* ── Scrollable content area ───────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 pb-2" style={{ overscrollBehavior: 'contain' }}>

        <label className="text-xs opacity-70">URL</label>
        <div className="flex gap-2 mt-1">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
          />
          <button onClick={() => doProbe()} disabled={!url || busy || probing} className="px-3 py-2 text-xs rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 disabled:opacity-50">
            {probeState === 'loading' ? 'Analyzing...' : probeState === 'done' ? 'Refresh' : probeState === 'error' ? 'Retry' : 'Probe'}
          </button>
        </div>

        {isVideo && (
          <div className="mt-3 text-xs bg-gradient-to-r from-pink-500/15 to-violet-500/15 rounded-xl p-3 border border-pink-400/30">
            <b>Video platform detected</b> — will be downloaded via yt-dlp (auto-extracts the media stream). The filename comes from the video title.
          </div>
        )}
        {info && !info.isVideo && (
          <div className="mt-3 text-xs opacity-80 bg-white/5 rounded-xl p-3 border border-white/10">
            <div>Size: {info.size ? (info.size / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}</div>
            <div>Supports ranges: {info.acceptsRanges ? 'Yes' : 'No'}</div>
            <div>Filename: {info.filename}</div>
          </div>
        )}
        {probing && isVideo && (
          <div className="mt-3 text-xs flex items-center gap-2 opacity-80">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            Analyzing video formats…
          </div>
        )}

        {info && info.isVideo && (
          <>
            <div className="mt-3 flex gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              {info.thumbnail && (
                <img src={info.thumbnail} alt="" className="w-28 h-16 object-cover rounded-md shrink-0" />
              )}
              <div className="text-xs min-w-0">
                <div className="font-medium text-sm truncate">{info.title}</div>
                {info.uploader && <div className="opacity-70 truncate">{info.uploader}</div>}
                {info.duration ? <div className="opacity-70">
                  {Math.floor(info.duration/60)}:{String(info.duration%60).padStart(2,'0')} min
                </div> : null}
                {!info.hasFfmpeg && (
                  <div className="mt-1 text-[10px] text-amber-300">
                    ffmpeg not detected — only pre-muxed qualities and no MP3.
                  </div>
                )}
              </div>
            </div>

            {/* Mode selector: Video with Audio (default) vs Audio Only */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAudioOnly(false)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs transition border ${
                  !audioOnly
                    ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                Video + Audio
              </button>
              <button
                type="button"
                onClick={() => { setAudioOnly(true); const audioQ = info.qualities.find(q => q.kind === 'audio'); if (audioQ) setSelectedQuality(audioQ); }}
                className={`flex-1 px-3 py-2 rounded-xl text-xs transition border ${
                  audioOnly
                    ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                Audio Only (MP3)
              </button>
            </div>

            {info.qualities && info.qualities.length > 0 && !audioOnly && (
              <div className="mt-3">
                <div className="text-xs opacity-70 mb-2">Select quality</div>
                <div className="grid grid-cols-2 gap-2">
                  {info.qualities.map((q) => {
                    const sel = selectedQuality && selectedQuality.id === q.id;
                    const isAudio = q.kind === 'audio';
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuality(q)}
                        className={`text-left px-3 py-2 rounded-xl border text-xs transition relative overflow-hidden
                          ${sel
                            ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 turbo-ring'
                            : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                      >
                        <div className="flex items-center gap-2">
                          <AppIcon src={isAudio ? 'icon/file icon.png' : 'icon/download icon.png'} size={16} />
                          <span className="font-medium">{q.label}</span>
                          {q.badge && (
                            <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${
                              q.badge === 'Direct' ? 'bg-emerald-500/30 text-emerald-200' :
                              q.badge === 'HD' ? 'bg-violet-500/30 text-violet-200' :
                              q.badge === 'Audio' ? 'bg-pink-500/30 text-pink-200' :
                              'bg-amber-500/30 text-amber-200'
                            }`}>
                              {q.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 opacity-70">
                          {q.size ? `~${(q.size / 1024 / 1024).toFixed(1)} MB` : '—'}
                          {q.ext ? ` · .${q.ext}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <label className="text-xs opacity-70 mt-4 block">Save to</label>
        <div className="flex gap-2 mt-1">
          <input
            value={dir} onChange={(e) => setDir(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none"
          />
          <button onClick={pick} className="px-3 py-2 text-xs rounded-xl bg-white/10 hover:bg-white/20">Browse…</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs opacity-70">Connections</label>
            <input
              type="number" min={1} max={128}
              value={conns} onChange={(e) => setConns(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs opacity-70">Filename {isVideo && <span className="opacity-60">(auto from title)</span>}</label>
            <input
              value={filename} onChange={(e) => setFilename(e.target.value)}
              placeholder={isVideo ? 'leave blank for video title' : 'auto'}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        {err && (
          <div className="mt-3 text-xs">
            {/* Only show the cookie retry panel for CONFIRMED content restrictions.
                Transient errors (network, rate-limit, anti-bot) get the plain error box. */}
            {/this content is restricted|age-restricted video|sign into the video platform/i.test(err) ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-300">
                <div className="font-medium mb-0.5">Restricted Content</div>
                <div className="opacity-80">{err}</div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={retryBrowser || ''}
                    onChange={(e) => setRetryBrowser(e.target.value)}
                    className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[11px] outline-none"
                  >
                    <option value="">Choose browser…</option>
                    <option value="edge">Microsoft Edge</option>
                    <option value="chrome">Chrome</option>
                    <option value="brave">Brave</option>
                    <option value="firefox">Firefox</option>
                    <option value="opera">Opera</option>
                    <option value="vivaldi">Vivaldi</option>
                    <option value="safari">Safari</option>
                  </select>
                  <button
                    onClick={() => { if (retryBrowser) doProbe(retryBrowser); }}
                    disabled={!retryBrowser || probing}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[11px] disabled:opacity-40"
                  >
                    {probing ? 'Retrying…' : 'Retry with cookies'}
                  </button>
                </div>
                <div className="mt-1 opacity-60 text-[10px]">Sign into the video site in that browser first, then retry.</div>
              </div>
            ) : (
              /* Clean, simple error for all other cases - no technical details */
              <div className="text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
          </div>
        )}

        </div>{/* end scrollable */}

        {/* ── Pinned footer ─────────────────────────────────────────────── */}
        <div className="px-6 pb-6 pt-4 shrink-0 border-t border-white/5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10">Cancel</button>
          <button
            onClick={submit} disabled={!url || !dir || busy || probing}
            className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:brightness-110 shadow-turbo btn-turbo"
          >
            {probing ? 'Analyzing...' : 'Start Download'}
          </button>
        </div>

      </div>
    </div>
  );
}
