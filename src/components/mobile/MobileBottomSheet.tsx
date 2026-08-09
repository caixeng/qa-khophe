import * as React from 'react';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[85dvh]',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef('');
  const titleId = useId();

  // Đóng bằng phím ESC & khóa scroll body khi mở sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      window.setTimeout(() => {
        sheetRef.current
          ?.querySelector<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])')
          ?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = previousOverflow.current;
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
      {/* Backdrop mờ */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'sheet-safe-bottom relative w-full bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border-color)] shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-up',
          maxHeight,
        )}
      >
        {/* Handle Bar vuốt trượt */}
        <div className="w-full flex justify-center py-2.5" aria-hidden="true">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-color)] hover:bg-[var(--text-muted)] transition-colors" />
        </div>

        {/* Sheet Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--border-color)]">
            <h3 id={titleId} className="font-bold text-base text-[var(--text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="tap-target flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Sheet Body */}
        <div className="mobile-scroll-area flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};
