// Custom hook that keeps a live map of downloads via SSE.
import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api';

export function useDownloads(onEvent) {
  const [downloads, setDownloads] = useState({});
  const evtRef = useRef(null);
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let es;
    let cancelled = false;

    const connect = async () => {
      try {
        const initial = await api.list();
        if (cancelled) return;
        const m = {};
        initial.forEach((d) => (m[d.id] = d));
        setDownloads(m);
      } catch (_) {}

      es = api.events();
      evtRef.current = es;

      es.addEventListener('snapshot', (e) => {
        const arr = JSON.parse(e.data);
        const m = {};
        arr.forEach((d) => (m[d.id] = d));
        setDownloads(m);
      });
      es.addEventListener('change', (e) => {
        const d = JSON.parse(e.data);
        setDownloads((p) => ({ ...p, [d.id]: d }));
        cbRef.current && cbRef.current('change', d);
      });
      es.addEventListener('completed', (e) => {
        const d = JSON.parse(e.data);
        setDownloads((p) => ({ ...p, [d.id]: d }));
        cbRef.current && cbRef.current('completed', d);
      });
      es.addEventListener('failed', (e) => {
        const d = JSON.parse(e.data);
        setDownloads((p) => ({ ...p, [d.id]: d }));
        cbRef.current && cbRef.current('failed', d);
      });
      es.addEventListener('removed', (e) => {
        const { id } = JSON.parse(e.data);
        setDownloads((p) => {
          const n = { ...p };
          delete n[id];
          return n;
        });
      });
    };

    connect();
    return () => {
      cancelled = true;
      if (es) es.close();
    };
  }, []);

  const list = useCallback(() => Object.values(downloads), [downloads]);
  return { downloads, list };
}
