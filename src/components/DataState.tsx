import * as React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DataStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const DataState: React.FC<DataStateProps> = ({
  loading,
  error,
  isEmpty,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Chưa có bản ghi nào được tìm thấy.',
  onRetry,
  children,
  className
}) => {
  if (loading) {
    return (
      <div className={cn("w-full space-y-4 py-8 animate-pulse", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-[var(--bg-app)] rounded-lg w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Đã xảy ra lỗi</h3>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">{error}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
        <div className="w-16 h-16 bg-[var(--bg-app)] rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-[var(--text-tertiary)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{emptyTitle}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
};
