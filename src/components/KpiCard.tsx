import * as React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: any; // Can be component reference or JSX element
  trend?: number | { value: number; isPositive?: boolean };
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
    isPos = trend.isPositive ?? (trend.value >= 0);
  }

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'card p-5 relative overflow-hidden animate-fade-in-up',
        className
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', colorMap[color].split(' ')[2])} />
      
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
          <h3 className="text-2xl font-bold font-mono text-[var(--text-primary)]">{value}</h3>
          
          {subtitle && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
          )}

          {trendVal !== null && (
            <div className={cn(
              "flex items-center text-xs font-medium mt-2",
              isPos ? "text-emerald-600" : "text-rose-600"
            )}>
              {isPos ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              )}
              <span>{trendVal}% so với tháng trước</span>
            </div>
          )}
        </div>
        
        <div className={cn('p-3 rounded-full flex items-center justify-center', iconBgMap[color])}>
          {React.isValidElement(Icon) ? (
            Icon
          ) : Icon ? (
            <Icon className={cn('w-6 h-6', colorMap[color].split(' ')[1])} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
