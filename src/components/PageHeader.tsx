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
  };
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, description, action, className }) => {
  const subText = subtitle || description;
  const IconComp = action?.icon;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
        {subText && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{subText}</p>
        )}
      </div>
      
      {action && (
        <button 
          onClick={action.onClick}
          className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
        >
          {React.isValidElement(IconComp) ? (
            IconComp
          ) : IconComp ? (
            <IconComp className="w-4 h-4" />
          ) : null}
          {action.label}
        </button>
      )}
    </div>
  );
};
