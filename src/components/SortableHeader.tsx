import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { SortConfig } from '../lib/sort';

interface SortableHeaderProps {
  /** Tên field trong dữ liệu — phải khớp key của bản ghi */
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Tiêu đề cột bấm được để sắp xếp.
 *
 * Dùng `<button>` bên trong `<th>` thay vì gắn onClick thẳng lên `<th>`: bàn
 * phím tab tới được, Enter/Space hoạt động sẵn, và trình đọc màn hình đọc ra
 * đúng là một nút bấm. `aria-sort` cho biết cột nào đang sắp xếp theo chiều nào.
 */
export const SortableHeader: React.FC<SortableHeaderProps> = ({
  sortKey,
  sortConfig,
  onSort,
  children,
  align = 'left',
  className,
}) => {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th
      scope="col"
      className={cn('th-cell', align === 'right' && 'text-right', className)}
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sắp xếp theo ${typeof children === 'string' ? children : 'cột này'}`}
        className={cn(
          'inline-flex items-center gap-1 font-inherit uppercase tracking-inherit cursor-pointer transition-colors hover:text-[var(--primary-600)]',
          align === 'right' && 'flex-row-reverse',
          isActive && 'text-[var(--primary-600)]',
        )}
      >
        <span>{children}</span>
        {direction === 'asc' ? (
          <ChevronUp size={13} strokeWidth={3} />
        ) : direction === 'desc' ? (
          <ChevronDown size={13} strokeWidth={3} />
        ) : (
          <ChevronsUpDown size={13} className="opacity-40" />
        )}
      </button>
    </th>
  );
};
