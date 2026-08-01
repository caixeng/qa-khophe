import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MobileCardItem {
  id: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  fields?: { label: string; value: React.ReactNode }[];
  accentColor?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}

interface MobileCardListProps {
  items: MobileCardItem[];
  emptyMessage?: string;
  className?: string;
}

export const MobileCardList: React.FC<MobileCardListProps> = ({
  items,
  emptyMessage = 'Không có dữ liệu',
  className,
}) => {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 lg:hidden", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={cn(
            "p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs transition-all active:scale-[0.99] relative overflow-hidden",
            item.onClick && "cursor-pointer hover:border-[var(--primary-400)]"
          )}
        >
          {/* Accent bar color on left border if defined */}
          {item.accentColor && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: item.accentColor }}
            />
          )}

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug truncate">
                {item.title}
              </h4>
              {item.subtitle && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
            {item.badge && <div className="shrink-0">{item.badge}</div>}
          </div>

          {/* Key-Value Fields Grid */}
          {item.fields && item.fields.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-color)]/60 text-xs">
              {item.fields.map((f, i) => (
                <div key={i} className="min-w-0">
                  <span className="text-[11px] text-[var(--text-muted)] block truncate">{f.label}</span>
                  <span className="font-semibold text-[var(--text-primary)] truncate block">{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer / Actions */}
          {item.actions && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[var(--border-color)]/60">
              {item.actions}
            </div>
          )}

          {/* Arrow Indicator if clickable and no custom actions */}
          {item.onClick && !item.actions && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-60">
              <ChevronRight size={18} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
