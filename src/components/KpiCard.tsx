import * as React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: any; // Can be component reference or JSX element
  trend?: number | { value: number; isPositive?: boolean };
  /** Nhãn sau số %, mặc định "so với kỳ trước" — đổi được vì không phải lúc nào kỳ đang xem cũng là 1 tháng. */
  trendLabel?: string;
  color?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  subtitle?: string;
  className?: string;
}

const colorMap = {
  success: 'bg-emerald-50 text-emerald-600 border-emerald-500',
  warning: 'bg-amber-50 text-amber-600 border-amber-500',
  danger: 'bg-rose-50 text-rose-600 border-rose-500',
  info: 'bg-blue-50 text-blue-600 border-blue-500',
  primary: 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary-500)]',
};

const iconBgMap = {
  success: 'bg-emerald-100',
  warning: 'bg-amber-100',
  danger: 'bg-rose-100',
  info: 'bg-blue-100',
  primary: 'bg-[var(--primary-100)]',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel = 'so với kỳ trước',
  color = 'primary',
  subtitle,
  className,
}) => {
  let trendVal: number | null = null;
  let isPos = true;

  if (typeof trend === 'number') {
    trendVal = Math.abs(trend);
    isPos = trend >= 0;
  } else if (trend && typeof trend === 'object') {
    trendVal = Math.abs(trend.value);
    isPos = trend.isPositive ?? trend.value >= 0;
  }

  return (
    <div
      role="region"
      aria-label={title}
      className={cn('card p-3 sm:p-5 relative overflow-hidden animate-fade-in-up', className)}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', colorMap[color].split(' ')[2])} />

      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-0.5 leading-snug">{title}</p>
          <h3 className="text-sm min-[360px]:text-base sm:text-2xl leading-tight font-bold font-mono text-[var(--text-primary)] [overflow-wrap:anywhere]">{value}</h3>

          {subtitle && <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] mt-0.5 break-words">{subtitle}</p>}

          {trendVal !== null && (
            <div
              className={cn(
                'flex items-center text-[10px] sm:text-xs font-medium mt-1.5',
                isPos ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {isPos ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              <span className="truncate">
                {trendVal}% {trendLabel}
              </span>
            </div>
          )}
        </div>

        <div className={cn('p-2 sm:p-3 rounded-full flex items-center justify-center shrink-0', iconBgMap[color])}>
          {React.isValidElement(Icon) ? (
            Icon
          ) : Icon ? (
            <Icon className={cn('w-4 h-4 sm:w-6 sm:h-6', colorMap[color].split(' ')[1])} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
