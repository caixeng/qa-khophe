import * as React from 'react';
import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'warning',
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef('');

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (variant === 'danger') cancelBtnRef.current?.focus();
        else confirmBtnRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = previousOverflow.current;
    }
    return () => {
      document.body.style.overflow = previousOverflow.current;
      triggerRef.current?.focus();
    };
  }, [isOpen, variant]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        // Prevent triggering if focus is already on the cancel button
        if (document.activeElement?.getAttribute('data-action') !== 'cancel') {
          e.preventDefault();
          onConfirm();
        }
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Dialog Card */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className={cn(
          'card bg-[var(--bg-surface)] w-full max-w-sm shadow-xl relative z-10 p-5',
          'animate-[scale-in_0.2s_ease-out_forwards]',
        )}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="tap-target absolute top-2 right-2 flex items-center justify-center hover:bg-[var(--bg-subtle)] rounded-xl transition-colors cursor-pointer text-[var(--text-secondary)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mb-4',
              variant === 'danger' && 'bg-rose-100 text-rose-600',
              variant === 'warning' && 'bg-amber-100 text-amber-600',
              variant === 'info' && 'bg-blue-100 text-blue-600',
            )}
          >
            {variant === 'danger' || variant === 'warning' ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>

          <h2 id="confirm-dialog-title" className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h2>

          <div id="confirm-dialog-message" className="text-sm text-[var(--text-secondary)] mb-6">{message}</div>
        </div>

        <div className="flex gap-3 justify-end">
          <button ref={cancelBtnRef} onClick={onClose} data-action="cancel" className="btn-secondary flex-1">
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={cn(
              'flex-1',
              variant === 'danger'
                ? 'btn-primary bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_0_rgba(225,29,72,0.35)]'
                : 'btn-primary',
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
