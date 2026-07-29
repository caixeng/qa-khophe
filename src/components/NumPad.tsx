import * as React from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../lib/utils';

export interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  unit?: string;
  className?: string;
}

export const NumPad: React.FC<NumPadProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  unit = 'kg',
  className 
}) => {
  const handlePress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) {
        onChange(value ? value + '.' : '0.');
      }
    } else {
      // Limit length if needed, or format
      if (value === '0' && key !== '.') {
        onChange(key);
      } else {
        onChange(value + key);
      }
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <div className={cn("w-full max-w-sm mx-auto flex flex-col gap-4", className)}>
      {/* Display */}
      <div className="card p-4 flex flex-col items-center justify-center bg-[var(--bg-surface)] border-2 border-[var(--primary-500)] shadow-sm">
        <div className="text-sm text-[var(--text-secondary)] font-medium uppercase tracking-widest mb-1">
          Khối lượng
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-mono font-bold text-[var(--text-primary)]">
            {value || '0'}
          </span>
          <span className="text-xl font-bold text-[var(--text-tertiary)]">{unit}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => handlePress(key)}
            className={cn(
              "h-16 flex items-center justify-center rounded-xl text-2xl font-semibold bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm active:scale-95 transition-transform touch-manipulation",
              key === 'backspace' ? "text-rose-500 bg-rose-50" : "text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
            )}
          >
            {key === 'backspace' ? <Delete className="w-8 h-8" /> : key}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button 
        onClick={onSubmit}
        disabled={!value || value === '0' || value === '0.'}
        className="btn-primary h-14 text-lg font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 transition-transform"
      >
        LƯU MÃ CÂN
      </button>
    </div>
  );
};
