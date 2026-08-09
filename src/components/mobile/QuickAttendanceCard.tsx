import * as React from 'react';
import { useState } from 'react';
import { User, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatTien } from '../../lib/utils';
import type { Employee } from '../../types';

export interface QuickAttendanceState {
  employee_id: string;
  attendance_id?: string;
  work_shift: number; // 1, 0.5, 0, or custom
  overtime_hours: number;
  daily_pay: number;
  advance_pay: number;
  notes: string;
}

interface QuickAttendanceCardProps {
  employee: Employee;
  state: QuickAttendanceState;
  onChange: (newState: QuickAttendanceState) => void;
}

export const QuickAttendanceCard: React.FC<QuickAttendanceCardProps> = ({
  employee,
  state,
  onChange,
}) => {
  const [showCustom, setShowCustom] = useState(false);

  const handleShiftSelect = (shift: number) => {
    onChange({
      ...state,
      work_shift: shift,
    });
  };

  const isFull = state.work_shift === 1;
  const isHalf = state.work_shift === 0.5;
  const isOff = state.work_shift === 0;
  const isCustom = !isFull && !isHalf && !isOff;

  const hasExtra = state.overtime_hours > 0 || state.advance_pay > 0 || Boolean(state.notes);

  return (
    <div
      className={cn(
        'card p-4 rounded-2xl border transition-all duration-200 bg-[var(--bg-surface)]',
        isFull && 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10',
        isHalf && 'border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10',
        isOff && 'border-slate-300 dark:border-slate-800 opacity-75',
        isCustom && 'border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10',
      )}
    >
      {/* Top Header: Employee Name & Daily Rate */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm transition-colors',
              isFull && 'bg-emerald-600',
              isHalf && 'bg-amber-500',
              isOff && 'bg-slate-600',
              isCustom && 'bg-blue-600',
            )}
          >
            <User size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] truncate">
              {employee.name}
            </h3>
            <p className="text-xs font-mono font-extrabold text-[var(--primary-600)] dark:text-[var(--primary-400)]">
              {formatTien(employee.daily_salary)}/ngày
            </p>
          </div>
        </div>

        {/* Extra indicators (Overtime / Advance) */}
        {hasExtra && (
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {state.overtime_hours > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex items-center gap-1">
                <Clock size={10} /> +{state.overtime_hours}h
              </span>
            )}
            {state.advance_pay > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1">
                <DollarSign size={10} /> Ứng -{formatTien(state.advance_pay)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Touch Buttons: 1-Tap Attendance (1 Hàng Siêu Gọn) */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => handleShiftSelect(1)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer border px-1',
            isFull
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/40',
          )}
        >
          <span>🟢 1 Công</span>
        </button>

        <button
          type="button"
          onClick={() => handleShiftSelect(0.5)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer border px-1',
            isHalf
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm scale-[1.02]'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950/40',
          )}
        >
          <span>🟡 0.5</span>
        </button>

        <button
          type="button"
          onClick={() => handleShiftSelect(0)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer border px-1',
            isOff
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm scale-[1.02]'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800',
          )}
        >
          <span>🔴 Nghỉ</span>
        </button>

        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-0.5 cursor-pointer border px-1',
            showCustom || isCustom
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-blue-50 hover:text-blue-800 dark:hover:bg-blue-950/40',
          )}
        >
          <span>🔵 Thêm</span>
          {showCustom ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Custom Options Panel (Tăng ca, Tạm ứng, Ghi chú) */}
      {showCustom && (
        <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3 animate-fade-in text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`shift-input-${employee.id}`} className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Số công (nếu lẻ):
              </label>
              <input
                id={`shift-input-${employee.id}`}
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={state.work_shift}
                onChange={(e) => onChange({ ...state, work_shift: Number(e.target.value) || 0 })}
                className="input-field py-1.5 font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label htmlFor={`overtime-input-${employee.id}`} className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Giờ tăng ca (giờ):
              </label>
              <input
                id={`overtime-input-${employee.id}`}
                type="number"
                step="0.5"
                min="0"
                value={state.overtime_hours || ''}
                onChange={(e) => onChange({ ...state, overtime_hours: Number(e.target.value) || 0 })}
                className="input-field py-1.5 font-mono text-xs"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`advance-input-${employee.id}`} className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Tạm ứng trong ngày (đ):
              </label>
              <input
                id={`advance-input-${employee.id}`}
                type="number"
                step="10000"
                min="0"
                value={state.advance_pay || ''}
                onChange={(e) => onChange({ ...state, advance_pay: Number(e.target.value) || 0 })}
                className="input-field py-1.5 font-mono text-xs text-rose-600 font-bold"
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor={`daily-salary-input-${employee.id}`} className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Lương ngày (đ):
              </label>
              <input
                id={`daily-salary-input-${employee.id}`}
                type="number"
                step="10000"
                value={state.daily_pay}
                onChange={(e) => onChange({ ...state, daily_pay: Number(e.target.value) || 0 })}
                className="input-field py-1.5 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`notes-input-${employee.id}`} className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Ghi chú công:
            </label>
            <input
              id={`notes-input-${employee.id}`}
              type="text"
              value={state.notes || ''}
              onChange={(e) => onChange({ ...state, notes: e.target.value })}
              className="input-field py-1.5 text-xs"
              placeholder="VD: Làm ca đêm, xay phế nhựa..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
