import * as React from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div className={cn(
        "card bg-[var(--bg-surface)] w-full max-w-lg shadow-xl relative z-10 animate-fade-in flex flex-col max-h-[90vh]",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-subtle)] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/50 rounded-b-xl flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
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
  className
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
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea className={cn('input-field w-full min-h-[100px]', error && 'border-red-500 focus:ring-red-500', className)} />
      ) : (
        <input className={cn('input-field w-full', error && 'border-red-500 focus:ring-red-500', className)} />
      )}
      
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
