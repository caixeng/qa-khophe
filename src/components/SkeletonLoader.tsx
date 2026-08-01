import * as React from 'react';
import { cn } from '../lib/utils';

export const SkeletonPulse = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div 
    className={cn("animate-shimmer rounded-lg", className)} 
    style={{
      backgroundImage: 'linear-gradient(90deg, var(--bg-muted) 0%, var(--bg-surface) 50%, var(--bg-muted) 100%)',
      backgroundSize: '200% 100%',
      ...style
    }} 
  />
);

export const KpiCardSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card p-5">
        <div className="flex justify-between items-start">
          <div className="w-full mr-4">
            <SkeletonPulse className="h-4 w-1/2 mb-2" />
            <SkeletonPulse className="h-8 w-3/4 mb-2" />
            <SkeletonPulse className="h-3 w-1/3" />
          </div>
          <SkeletonPulse className="w-10 h-10 rounded-xl flex-shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number, cols?: number }) => (
  <div className="erp-table-container">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {[...Array(cols)].map((_, i) => (
              <th key={i} className="th-cell">
                <SkeletonPulse className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rIndex) => (
            <tr key={rIndex}>
              {[...Array(cols)].map((_, cIndex) => {
                const width = 50 + ((rIndex * cols + cIndex) * 17 % 40);
                return (
                  <td key={cIndex} className="td-cell">
                    <SkeletonPulse className="h-4" style={{ width: `${width}%` }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i}>
        <SkeletonPulse className="h-3 w-1/4 mb-2" />
        <SkeletonPulse className="h-10 w-full" />
      </div>
    ))}
    <div>
      <SkeletonPulse className="h-3 w-1/4 mb-2" />
      <SkeletonPulse className="h-24 w-full" />
    </div>
    <div className="flex justify-end gap-3 mt-6">
      <SkeletonPulse className="h-10 w-24 rounded-xl" />
      <SkeletonPulse className="h-10 w-32 rounded-xl" />
    </div>
  </div>
);
