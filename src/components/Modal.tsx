import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, className }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const prevIsOpen = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef('');
  const dirtyRef = useRef(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const confirmCloseRef = useRef(false);
  confirmCloseRef.current = confirmClose;

  const finishClose = useCallback(() => {
    dirtyRef.current = false;
    setConfirmClose(false);
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current && modalRef.current?.querySelector('form')) {
      setConfirmClose(true);
      return;
    }
    finishClose();
  }, [finishClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!confirmCloseRef.current) requestClose();
      }
    };

    if (isOpen) {
      if (!prevIsOpen.current) {
        triggerRef.current = document.activeElement as HTMLElement | null;
        previousOverflow.current = document.body.style.overflow;
        dirtyRef.current = false;
        setConfirmClose(false);
      }
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      // Chỉ tự động focus vào phần tử đầu tiên khi Modal MỚI MỞ
      // (Tránh cướp focus / mất nháy chuột khi người dùng đang gõ phím)
      if (!prevIsOpen.current) {
        setTimeout(() => {
          if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
              'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            const firstElement = focusableElements[0] as HTMLElement;
            if (firstElement) {
              firstElement.focus();
            }
          }
        }, 50);
      }
    } else {
      document.body.style.overflow = previousOverflow.current;
      document.removeEventListener('keydown', handleKeyDown);
      if (prevIsOpen.current) triggerRef.current?.focus();
    }

    prevIsOpen.current = isOpen;

    return () => {
      document.body.style.overflow = previousOverflow.current;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, requestClose]);

  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusableElements = modalRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={requestClose} />

      {/* Modal Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleTabKey}
        onInputCapture={() => {
          dirtyRef.current = true;
        }}
        onChangeCapture={() => {
          dirtyRef.current = true;
        }}
        onClickCapture={(event) => {
          if (!dirtyRef.current || !modalRef.current?.querySelector('form')) return;
          const button = (event.target as HTMLElement).closest('button');
          if (button?.type === 'button' && /^(Hủy|Đóng)$/i.test(button.textContent?.trim() || '')) {
            event.preventDefault();
            event.stopPropagation();
            setConfirmClose(true);
          }
        }}
        className={cn(
          'card bg-[var(--bg-surface)] w-full h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-w-lg sm:max-h-[90dvh] sm:rounded-xl shadow-xl relative z-10 animate-fade-in flex flex-col',
          className,
        )}
      >
        {/* Header */}
        <div className="modal-safe-top flex min-h-16 items-center justify-between px-4 pb-4 border-b border-[var(--border-color)] sm:p-4">
          <h2 id="modal-title" className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={requestClose}
            aria-label="Đóng"
            className="tap-target flex items-center justify-center hover:bg-[var(--bg-subtle)] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="adaptive-dialog-body mobile-scroll-area flex-1 p-4 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="modal-safe-bottom p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/50 sm:rounded-b-xl flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={finishClose}
        title="Bỏ thay đổi chưa lưu?"
        message="Thông tin bạn vừa nhập chưa được lưu. Nếu đóng bây giờ, các thay đổi sẽ bị mất."
        confirmText="Bỏ thay đổi"
        cancelText="Tiếp tục nhập"
        variant="warning"
      />
    </div>
  );
};

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  options?: { value: string | number; label: string }[];
  as?: 'input' | 'select' | 'textarea';
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  options,
  as = 'input',
  className,
}) => {
  return (
    <div className="mb-4">
      <label className="label-field block mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {children ? (
        children
      ) : as === 'select' ? (
        <select className={cn('input-field w-full', error && 'border-red-500 focus:ring-red-500', className)}>
          <option value="">-- Chọn --</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          className={cn(
            'input-field w-full min-h-[100px]',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
        />
      ) : (
        <input
          className={cn('input-field w-full', error && 'border-red-500 focus:ring-red-500', className)}
        />
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
