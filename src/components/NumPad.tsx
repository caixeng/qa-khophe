import * as React from 'react';
import { useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../lib/utils';

export interface NumPadProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit: (val: string) => void;
  unit?: string;
  className?: string;
}

export const NumPad: React.FC<NumPadProps> = ({ 
  value: externalValue, 
  onChange: externalOnChange, 
  onSubmit, 
  unit = 'kg',
  className 
}) => {
  const [internalValue, setInternalValue] = useState('');
  const currentValue = externalValue !== undefined ? externalValue : internalValue;

  const updateValue = (val: string) => {
    if (externalOnChange) {
      externalOnChange(val);
    }
    setInternalValue(val);
  };

  const handlePress = (key: string) => {
    if (key === 'backspace') {
      updateValue(currentValue.slice(0, -1));
    } else if (key === '.') {
      if (!currentValue.includes('.')) {
        updateValue(currentValue ? currentValue + '.' : '0.');
      }
    } else {
      if (currentValue === '0' && key !== '.') {
        updateValue(key);
      } else {
        updateValue(currentValue + key);
      }
    }
  };

  const handleSubmit = () => {
    if (currentValue && currentValue !== '0' && currentValue !== '0.') {
      onSubmit(currentValue);
      updateValue('');
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <div className={cn("w-full max-w-sm mx-auto flex flex-col gap-4", className)}>
      {/* Display */}
      <div className="card p-4 flex flex-col items-center justify-center bg-[var(--bg-surface)] border-2 border-[var(--primary-500)] shadow-xs rounded-2xl">
        <div className="text-[11px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest mb-1">
          Khối lượng bao phế
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-mono font-black text-[var(--text-primary)]">
            {currentValue || '0'}
          </span>
          <span className="text-lg font-bold text-[var(--primary-500)]">{unit}</span>
        </div>
      </div>

      {/* Touch-Optimized 3x4 Keypad Grid (Min height 56px per key for mobile 1-hand touch) */}
      <div className="grid grid-cols-3 gap-2.5">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePress(key)}
            className={cn(
              "h-14 sm:h-16 flex items-center justify-center rounded-2xl text-2xl font-bold font-mono bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-xs active:scale-90 transition-transform touch-manipulation cursor-pointer",
              key === 'backspace' ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30" : "text-[var(--text-primary)] hover:bg-[var(--primary-50)]/50"
            )}
          >
            {key === 'backspace' ? <Delete className="w-7 h-7" /> : key}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button 
        type="button"
        onClick={handleSubmit}
        disabled={!currentValue || currentValue === '0' || currentValue === '0.'}
        className="btn-primary h-14 text-base font-bold rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 transition-transform cursor-pointer"
      >
        LƯU MÃ CÂN BAO PHẾ
      </button>
    </div>
  );
};
