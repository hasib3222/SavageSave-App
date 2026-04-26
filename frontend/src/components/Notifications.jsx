import React, { useEffect, useState } from 'react';

let externalPush = null;
export function pushNotification(n) { externalPush && externalPush(n); }

// In-app toast system. Also pairs with OS notifications via window.api.notify().
export default function Notifications() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    externalPush = (n) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, ...n }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), n.duration || 4500);
    };
    return () => { externalPush = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className="glass rounded-xl p-3 text-sm turbo-ring animate-glow">
          <div className="font-medium">{t.title}</div>
          {t.body && <div className="opacity-80 text-xs mt-0.5">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
