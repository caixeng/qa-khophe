import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (count: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, currentPage + 1);

    if (currentPage === 1) {
      endPage = Math.min(totalPages, 3);
    } else if (currentPage === totalPages) {
      startPage = Math.max(1, totalPages - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex flex-row justify-between items-center gap-2 py-1.5 text-[11px] sm:text-xs font-bold w-full">
      <div className="text-[var(--text-secondary)] whitespace-nowrap tabular-nums">
        Đang xem {startItem}–{endItem} / {totalItems} bản ghi
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onItemsPerPageChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Hiển thị:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-2 py-1 outline-none focus:border-[var(--primary-500)]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="Trang đầu"
            className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <ChevronsLeft size={15} />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer',
                  page === currentPage
                    ? 'bg-[var(--primary-500)] text-white'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <div className="sm:hidden flex items-center px-1.5 text-[var(--text-secondary)] tabular-nums">
            {currentPage}/{totalPages || 1}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label="Trang sau"
            className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label="Trang cuối"
            className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
