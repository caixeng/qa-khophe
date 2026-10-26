import * as React from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
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

function formatShortDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

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

  const [showCustomDates, setShowCustomDates] = React.useState(false);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-2 sm:p-2.5 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      {/* Hàng chính: các nút chọn nhanh + nút mở chọn ngày tuỳ chỉnh trên mobile */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="hidden lg:flex items-center gap-1.5 text-[var(--text-secondary)] shrink-0 mr-1">
          <CalendarRange size={15} className="text-[var(--primary-500)] shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">
            Kỳ: {formatNgay(range.from)} – {formatNgay(range.to)}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
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
                  'h-7 shrink-0 rounded-lg border px-2.5 text-[11px] font-bold transition-all duration-150 cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'border-[var(--primary-500)] bg-[var(--primary-500)] text-white shadow-2xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Nút bấm thu gọn khoảng ngày trên mobile/tablet (< lg) */}
        <button
          type="button"
          onClick={() => setShowCustomDates((prev) => !prev)}
          aria-expanded={showCustomDates}
          className={cn(
            'lg:hidden flex items-center gap-1 h-7 px-2 rounded-lg border text-[11px] font-bold shrink-0 transition-colors cursor-pointer',
            showCustomDates || !activeLabel
              ? 'border-[var(--primary-500)]/40 bg-[var(--primary-50)] text-[var(--primary-600)]'
              : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
          )}
        >
          <CalendarRange size={12} className="text-[var(--primary-500)] shrink-0" />
          <span className="font-mono tabular-nums">
            {formatShortDate(range.from)}–{formatShortDate(range.to)}
          </span>
          <ChevronDown
            size={12}
            className={cn('transition-transform duration-150', showCustomDates && 'rotate-180')}
          />
        </button>
      </div>

      {/* Ô chọn Từ ngày - Đến ngày: ẩn mặc định trên mobile (mở khi bấm nút lịch), luôn hiện trên desktop */}
      <div
        className={cn(
          'items-center gap-1.5 pt-1.5 border-t border-[var(--border-color)]/60 lg:pt-0 lg:border-t-0',
          showCustomDates ? 'flex' : 'hidden lg:flex',
        )}
      >
        <input
          type="date"
          aria-label="Từ ngày"
          value={range.from}
          max={range.to}
          onChange={(e) => onChange(e.target.value, range.to)}
          className="input-field !min-h-8 !py-1 !px-2 !text-xs flex-1 lg:w-auto font-mono transition-colors duration-200"
        />
        <span className="text-xs text-[var(--text-muted)] font-bold">–</span>
        <input
          type="date"
          aria-label="Đến ngày"
          value={range.to}
          min={range.from}
          onChange={(e) => onChange(range.from, e.target.value)}
          className="input-field !min-h-8 !py-1 !px-2 !text-xs flex-1 lg:w-auto font-mono transition-colors duration-200"
        />
      </div>
    </div>
  );
};
