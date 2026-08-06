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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the confirm button when opened
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
        className={cn(
          'card bg-[var(--bg-surface)] w-full max-w-sm shadow-xl relative z-10 p-5',
          'animate-[scale-in_0.2s_ease-out_forwards]',
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-[var(--bg-subtle)] rounded-md transition-colors cursor-pointer text-[var(--text-secondary)]"
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

          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h2>

          <div className="text-sm text-[var(--text-secondary)] mb-6">{message}</div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} data-action="cancel" className="btn-secondary flex-1">
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
