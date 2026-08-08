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
              'w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0',
              isFull && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
              isHalf && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
              isOff && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
              isCustom && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            )}
          >
            <User size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] truncate">
              {employee.name}
            </h3>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              {formatTien(employee.daily_salary)}/ngày
            </p>
          </div>
        </div>

        {/* Extra indicators (Overtime / Advance) */}
        {hasExtra && (
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {state.overtime_hours > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1">
                <Clock size={10} /> +{state.overtime_hours}h
              </span>
            )}
            {state.advance_pay > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                <DollarSign size={10} /> Ứng -{formatTien(state.advance_pay)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Touch Buttons: 1-Tap Attendance */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleShiftSelect(1)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border',
            isFull
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-transparent hover:bg-emerald-100 hover:text-emerald-800',
          )}
        >
          <span>🟢 1 Công</span>
          <span className="text-[10px] opacity-80 font-mono">Đủ ngày</span>
        </button>

        <button
          type="button"
          onClick={() => handleShiftSelect(0.5)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border',
            isHalf
              ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-transparent hover:bg-amber-100 hover:text-amber-800',
          )}
        >
          <span>🟡 0.5 Công</span>
          <span className="text-[10px] opacity-80 font-mono">Nửa ngày</span>
        </button>

        <button
          type="button"
          onClick={() => handleShiftSelect(0)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border',
            isOff
              ? 'bg-slate-700 text-white border-slate-700 shadow-md scale-[1.02]'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-transparent hover:bg-slate-200 hover:text-slate-800',
          )}
        >
          <span>🔴 0 Công</span>
          <span className="text-[10px] opacity-80 font-mono">Nghỉ làm</span>
        </button>

        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            'h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border',
            showCustom || isCustom
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-transparent hover:bg-blue-100 hover:text-blue-800',
          )}
        >
          <span className="flex items-center gap-0.5">
            🔵 Thêm {showCustom ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
          <span className="text-[10px] opacity-80 font-mono">Tăng ca/Ứng</span>
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
