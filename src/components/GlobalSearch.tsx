import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Truck, Users, UserCheck, X } from 'lucide-react';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { contactsService } from '../services/contactsService';
import { employeesService } from '../services/employeesService';
import { formatNgay, formatKg } from '../lib/utils';

interface Hit {
  loai: string;
  icon: typeof Package;
  ma: string;
  ten: string;
  to: string;
}

/** Modal tìm kiếm toàn cục (Ctrl+K). Nạp dữ liệu 1 lần khi mở, lọc phía client. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState<Hit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQ('');
      return;
    }
    if (data) return;
    let active = true;
    (async () => {
      setLoadError(null);
      const results = await Promise.allSettled([
        importsService.getAll(),
        exportsService.getAll(),
        contactsService.getAll(),
        employeesService.getAll(),
      ]);
      if (!active) return;
      const imports = results[0].status === 'fulfilled' ? results[0].value : [];
      const exports = results[1].status === 'fulfilled' ? results[1].value : [];
      const contacts = results[2].status === 'fulfilled' ? results[2].value : [];
      const employees = results[3].status === 'fulfilled' ? results[3].value : [];
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      const hits: Hit[] = [
        ...imports.map((r) => ({
          loai: 'Phiếu nhập',
          icon: Package,
          ma: formatNgay(r.date),
          ten: `${r.contact_name || 'Khách lẻ'} · ${formatKg(r.quantity_kg)}`,
          to: '/phe?tab=nhap',
        })),
        ...exports.map((r) => ({
          loai: 'Phiếu xuất',
          icon: Truck,
          ma: formatNgay(r.date),
          ten: `${r.contact_name || 'Khách lẻ'} · ${r.bags_count} bao`,
          to: '/phe?tab=xuat',
        })),
        ...contacts.map((r) => ({
          loai: r.type === 'supplier' ? 'Nhà cung cấp' : 'Khách hàng',
          icon: Users,
          ma: r.name,
          ten: r.phone || r.address || '',
          to: '/danh-ba',
        })),
        ...employees.map((r) => ({
          loai: 'Nhân viên',
          icon: UserCheck,
          ma: r.name,
          ten: r.phone || '',
          to: '/nhan-vien',
        })),
      ];
      setData(hits);
      if (failedCount > 0) {
        setLoadError(
          failedCount === results.length
            ? 'Không tải được dữ liệu tìm kiếm. Kiểm tra kết nối rồi thử lại.'
            : 'Một phần dữ liệu chưa tải được; kết quả có thể chưa đầy đủ.',
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [open, data]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !data) return [];
    return data.filter((h) => `${h.ma} ${h.ten}`.toLowerCase().includes(s)).slice(0, 20);
  }, [q, data]);

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm toàn hệ thống"
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-0 backdrop-blur-sm animate-fade-in sm:items-start sm:p-4 sm:pt-24"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card flex h-[100dvh] w-full flex-col overflow-hidden rounded-none shadow-dropdown animate-fade-in-up sm:h-auto sm:max-w-xl sm:rounded-xl">
        <div className="modal-safe-top flex min-h-16 items-center gap-2 border-b border-border px-4 pb-3 sm:py-3">
          <Search size={16} className="text-ink-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm phiếu nhập, phiếu xuất, đối tác, nhân viên..."
            className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted"
          />
          <button onClick={onClose} aria-label="Đóng tìm kiếm" className="tap-target flex items-center justify-center rounded-xl text-ink-muted hover:bg-subtle cursor-pointer">
            <X size={15} />
          </button>
        </div>
        <div className="mobile-scroll-area flex-1 overflow-y-auto p-2 sm:max-h-96">
          {!data && <p className="px-3 py-6 text-center text-xs text-ink-muted">Đang tải dữ liệu...</p>}
          {loadError && <p className="mx-2 my-2 rounded-xl bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800">{loadError}</p>}
          {data && q && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">Không có kết quả cho "{q}".</p>
          )}
          {!q && data && (
            <p className="px-3 py-6 text-center text-xs text-ink-muted">
              Nhập từ khóa để tìm trên toàn hệ thống.
            </p>
          )}
          {results.map((h, i) => (
            <button
              key={i}
              onClick={() => go(h.to)}
              className="tap-target flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-subtle cursor-pointer"
            >
              <h.icon size={16} className="shrink-0 text-primary-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{h.ma}</p>
                <p className="truncate text-xs text-ink-muted">{h.ten}</p>
              </div>
              <span className="shrink-0 rounded-full bg-subtle px-2 py-0.5 text-2xs font-bold text-ink-muted">
                {h.loai}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
