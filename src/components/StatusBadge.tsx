import * as React from 'react';
import { cn } from '../lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusVariant;
  className?: string;
}

const statusMap: Record<string, { label: string; variant: StatusVariant }> = {
  // Thanh toán
  paid: { label: 'Đã TT', variant: 'success' },
  unpaid: { label: 'Chưa TT', variant: 'danger' },
  partial: { label: 'TT 1 phần', variant: 'warning' },
  // Trạng thái chung
  pending: { label: 'Chờ xử lý', variant: 'warning' },
  done: { label: 'Hoàn thành', variant: 'success' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  // Xay phế
  grinding: { label: 'Đang xay', variant: 'info' },
  in_progress: { label: 'Đang xay', variant: 'info' },
  // Trạng thái liên hệ
  active: { label: 'Hoạt động', variant: 'success' },
  inactive: { label: 'Tạm ngưng', variant: 'neutral' },
};

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-rose-100 text-rose-700 border-rose-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = '', variant, className }) => {
  const mapped = statusMap[status ? status.toLowerCase() : ''];
  const displayLabel = mapped ? mapped.label : (status || '-');
  const displayVariant = variant || (mapped ? mapped.variant : 'neutral');

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variantStyles[displayVariant],
      className
    )}>
      {displayLabel}
    </span>
  );
};
