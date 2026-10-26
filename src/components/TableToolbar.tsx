import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { DateRangePicker } from './DateRangePicker';

export interface TableToolbarProps {
  searchTerm?: string;
  searchQuery?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  setSearchQuery?: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  totalCount?: number;
  className?: string;
  showDateFilter?: boolean;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  searchQuery,
  searchValue,
  onSearchChange,
  setSearchQuery,
  placeholder = 'Tìm kiếm...',
  children,
  totalCount,
  className,
  showDateFilter,
  startDate,
  endDate,
  onDateChange,
}) => {
  const value =
    searchValue !== undefined
      ? searchValue
      : searchQuery !== undefined
        ? searchQuery
        : searchTerm !== undefined
          ? searchTerm
          : '';
  const handleChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    if (setSearchQuery) setSearchQuery(val);
  };

  const hasExtraTools = Boolean((showDateFilter && onDateChange) || children);

  return (
    <div
      className={cn(
        'table-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl shadow-2xs',
        className,
      )}
    >
      <div className="flex items-center gap-2 w-full sm:max-w-md flex-1">
        <div role="search" className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Tìm kiếm"
            className="input-field !min-h-9 w-full !pl-8 !pr-7 !py-1.5 text-xs font-medium bg-[var(--bg-subtle)] border-[var(--border-color)] rounded-lg placeholder:text-[var(--text-placeholder)] focus:ring-2 focus:ring-[var(--primary-500)]/20"
          />
          {value && (
            <button
              type="button"
              onClick={() => handleChange('')}
              aria-label="Xóa tìm kiếm"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Khi không có bộ lọc phụ, ghim luôn tổng số trên cùng 1 hàng với ô tìm kiếm trên mobile */}
        {!hasExtraTools && totalCount !== undefined && (
          <div className="sm:hidden text-[11px] text-[var(--text-muted)] whitespace-nowrap bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] font-semibold shrink-0">
            Tổng: <span className="font-bold text-[var(--primary-500)] tabular-nums">{totalCount}</span>
          </div>
        )}
      </div>

      {(hasExtraTools || totalCount !== undefined) && (
        <div
          className={cn(
            'flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar',
            !hasExtraTools && 'hidden sm:flex',
          )}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {showDateFilter && onDateChange && (
              <DateRangePicker startDate={startDate || ''} endDate={endDate || ''} onChange={onDateChange} />
            )}
            {children}
          </div>

          {totalCount !== undefined && (
            <div className="text-[11px] sm:text-xs text-[var(--text-muted)] whitespace-nowrap bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] font-medium shrink-0">
              Tổng số: <span className="font-bold text-[var(--primary-500)] tabular-nums">{totalCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
