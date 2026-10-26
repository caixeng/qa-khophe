import * as React from 'react';
import { cn } from '../lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  action?: {
    label: string;
    icon?: any;
    onClick: () => void;
    disabled?: boolean;
  };
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  action,
  className,
}) => {
  const subText = subtitle || description;
  const IconComp = action?.icon;

  return (
    <div
      className={cn(
        'page-heading flex items-center justify-between gap-2 sm:gap-4',
        !action && 'hidden lg:flex',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {/* Trên mobile đã có tiêu đề ở MobileHeader nên chỉ hiện mô tả ngắn gọn */}
        <h1 className="hidden lg:block text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {subText && (
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] lg:mt-1 truncate">{subText}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          className="btn-primary flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {React.isValidElement(IconComp) ? (
            IconComp
          ) : IconComp ? (
            <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : null}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};
