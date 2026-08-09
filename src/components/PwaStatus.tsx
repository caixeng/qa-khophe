import { useEffect, useRef, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const hadController = useRef(Boolean(navigator.serviceWorker?.controller));

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleControllerChange = () => {
      if (hadController.current) setUpdateAvailable(true);
      hadController.current = true;
    };
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (online && !updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[80] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm shadow-xl"
    >
      {online ? (
        <RefreshCw size={18} className="shrink-0 text-[var(--primary-600)]" />
      ) : (
        <CloudOff size={18} className="shrink-0 text-amber-600" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[var(--text-primary)]">
          {online ? 'Đã có phiên bản mới' : 'Đang ngoại tuyến'}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {online ? 'Tải lại để sử dụng bản mới nhất.' : 'Dữ liệu mới sẽ không thể tải hoặc lưu cho tới khi có mạng.'}
        </p>
      </div>
      {online && (
        <button type="button" onClick={() => window.location.reload()} className="btn-primary shrink-0">
          Tải lại
        </button>
      )}
    </div>
  );
}
