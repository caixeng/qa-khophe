import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!open) {
      setQ('');
      return;
    }
    if (data) return;
    (async () => {
      const [imports, exports, contacts, employees] = await Promise.all([
        importsService.getAll(),
        exportsService.getAll(),
        contactsService.getAll(),
        employeesService.getAll(),
      ]);
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
    })();
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-24 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-xl overflow-hidden shadow-dropdown animate-fade-in-up">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={16} className="text-ink-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm phiếu nhập, phiếu xuất, đối tác, nhân viên..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
          />
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-subtle cursor-pointer">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {!data && <p className="px-3 py-6 text-center text-xs text-ink-muted">Đang tải dữ liệu...</p>}
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
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-subtle cursor-pointer"
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
