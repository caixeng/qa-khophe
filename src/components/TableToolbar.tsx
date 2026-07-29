import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';

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
  className
}) => {
  const value = searchValue !== undefined ? searchValue : (searchQuery !== undefined ? searchQuery : (searchTerm !== undefined ? searchTerm : ''));
  const handleChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    if (setSearchQuery) setSearchQuery(val);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs", className)}>
      <div className="relative w-full sm:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="input-field w-full pl-10 pr-4 py-2 text-xs font-medium bg-[var(--bg-subtle)] border-[var(--border-color)] rounded-xl placeholder:text-[var(--text-placeholder)] focus:ring-2 focus:ring-[var(--primary-500)]/20"
        />
      </div>
      
      <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
        {children}
        
        {totalCount !== undefined && (
          <div className="text-xs text-[var(--text-muted)] whitespace-nowrap bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-color)] font-medium">
            Tổng số: <span className="font-bold text-[var(--primary-500)]">{totalCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
