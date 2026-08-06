import * as React from 'react';
import { cn } from '../lib/utils';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className
}) => {
  const handlePreset = (daysBack: number, startOfSelected?: boolean) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = new Date();

    if (startOfSelected && daysBack === 30) {
      // Month to date
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (startOfSelected && daysBack === 31) {
      // Previous month
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return onChange(start.toISOString().split('T')[0], lastDayPrevMonth.toISOString().split('T')[0]);
    } else {
      start.setDate(today.getDate() - daysBack);
    }

    onChange(start.toISOString().split('T')[0], end);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="input-field w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border-[var(--border-color)] rounded-xl"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="input-field w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border-[var(--border-color)] rounded-xl"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => handlePreset(0)} className="btn-ghost px-2 py-1 text-[11px] rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">Hôm nay</button>
        <button type="button" onClick={() => handlePreset(7)} className="btn-ghost px-2 py-1 text-[11px] rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">7 ngày</button>
        <button type="button" onClick={() => handlePreset(30)} className="btn-ghost px-2 py-1 text-[11px] rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">30 ngày</button>
        <button type="button" onClick={() => handlePreset(30, true)} className="btn-ghost px-2 py-1 text-[11px] rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">Tháng này</button>
        <button type="button" onClick={() => handlePreset(31, true)} className="btn-ghost px-2 py-1 text-[11px] rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">Tháng trước</button>
      </div>
    </div>
  );
};
