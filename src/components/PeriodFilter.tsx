import * as React from 'react';
import { CalendarRange } from 'lucide-react';
import { cn, formatNgay } from '../lib/utils';
import { daysAgo, today, type DateRange } from '../hooks/useDateRange';

interface Preset {
  label: string;
  compute: () => DateRange;
}

function startOfMonth(offset = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PRESETS: Preset[] = [
  { label: 'Hôm nay', compute: () => ({ from: today(), to: today() }) },
  { label: '7 ngày', compute: () => ({ from: daysAgo(6), to: today() }) },
  { label: '30 ngày', compute: () => ({ from: daysAgo(29), to: today() }) },
  { label: 'Tháng này', compute: () => ({ from: toISO(startOfMonth()), to: today() }) },
  {
    label: 'Tháng trước',
    compute: () => ({
      from: toISO(startOfMonth(-1)),
      to: toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 0)),
    }),
  },
  { label: '90 ngày', compute: () => ({ from: daysAgo(89), to: today() }) },
];

/**
 * Thanh chọn kỳ dùng chung cho mọi trang danh sách.
 *
 * Khoảng ngày này được đẩy xuống tận truy vấn Supabase, nên nó vừa là bộ lọc
 * hiển thị vừa là giới hạn dữ liệu tải về — và các thẻ KPI trên cùng trang
 * cũng tính theo đúng kỳ này, không còn cảnh nhãn ghi "tháng" nhưng con số lại
 * cộng dồn toàn bộ lịch sử.
 */
export const PeriodFilter: React.FC<{
  range: DateRange;
  onChange: (from: string, to: string) => void;
  className?: string;
}> = ({ range, onChange, className }) => {
  const activeLabel = PRESETS.find((p) => {
    const r = p.compute();
    return r.from === range.from && r.to === range.to;
  })?.label;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <CalendarRange size={16} className="text-[var(--primary-500)] shrink-0" />
        <span className="text-xs font-bold">
          Kỳ: {formatNgay(range.from)} – {formatNgay(range.to)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const isActive = activeLabel === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const r = p.compute();
                onChange(r.from, r.to);
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer',
                isActive
                  ? 'border-[var(--primary-500)] bg-[var(--primary-500)] text-white'
                  : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {p.label}
            </button>
          );
        })}

        <div className="flex items-center gap-1">
          <input
            type="date"
            aria-label="Từ ngày"
            value={range.from}
            max={range.to}
            onChange={(e) => onChange(e.target.value, range.to)}
            className="input-field w-auto px-2 py-1 text-[11px] sm:text-[11px]"
          />
          <span className="text-[var(--text-muted)]">–</span>
          <input
            type="date"
            aria-label="Đến ngày"
            value={range.to}
            min={range.from}
            onChange={(e) => onChange(range.from, e.target.value)}
            className="input-field w-auto px-2 py-1 text-[11px] sm:text-[11px]"
          />
        </div>
      </div>
    </div>
  );
};
