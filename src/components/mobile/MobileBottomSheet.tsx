import * as React from 'react';
import { useEffect, useRef } from 'react';
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
  maxHeight = 'max-h-[85vh]',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Đóng bằng phím ESC & khóa scroll body khi mở sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
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
        className={cn(
          "relative w-full bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border-color)] shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-up pb-safe-area",
          maxHeight
        )}
      >
        {/* Handle Bar vuốt trượt */}
        <div className="w-full flex justify-center py-2.5 cursor-grab active:cursor-grabbing" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-color)] hover:bg-[var(--text-muted)] transition-colors" />
        </div>

        {/* Sheet Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--border-color)]">
            <h3 className="font-bold text-base text-[var(--text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Sheet Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};
