import * as React from 'react';
import { XCircle, Package, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { TableSkeleton, KpiCardSkeleton, FormSkeleton, SkeletonPulse } from './SkeletonLoader';

export interface DataStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  skeletonType?: 'table' | 'kpi' | 'form' | 'pulse';
  skeletonRows?: number;
  skeletonCols?: number;
  children?: React.ReactNode;
  className?: string;
}

export const DataState: React.FC<DataStateProps> = ({
  loading,
  error,
  isEmpty,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Chưa có bản ghi nào được tìm thấy.',
  onRetry,
  onAction,
  actionLabel,
  skeletonType = 'table',
  skeletonRows = 5,
  skeletonCols = 5,
  children,
  className,
}) => {
  if (loading) {
    if (skeletonType === 'kpi') return <KpiCardSkeleton />;
    if (skeletonType === 'form') return <FormSkeleton />;
    if (skeletonType === 'pulse') return <SkeletonPulse className={cn('h-32 w-full', className)} />;
    return (
      <div className={className}>
        <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
        <XCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold text-rose-600 mb-2">Đã xảy ra lỗi</h3>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
        <div className="w-16 h-16 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{emptyTitle}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{emptyDescription}</p>
        {onAction && actionLabel && (
          <button onClick={onAction} className="btn-primary">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
