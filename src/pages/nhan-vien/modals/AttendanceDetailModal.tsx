import React from 'react';
import { Modal, FormField } from '../../../components/Modal';
import { Clock, Trash2 } from 'lucide-react';
import { cn, formatTien } from '../../../lib/utils';
import { calculateAttendancePay } from '../../../lib/payroll';
import { roleLabels } from '../types';
import type { Attendance, Employee, PaymentStatus } from '../../../types';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Partial<Attendance> | null;
  saving: boolean;
  employees: Employee[];
  onChange: (field: keyof Attendance, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: (id: string) => void;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  data,
  saving,
  employees,
  onChange,
  onSubmit,
  onDelete,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={data?.id ? 'Chỉnh sửa lượt chấm công' : 'Chấm công ngày cho nhân viên'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Ngày chấm công" required>
          <input
            type="date"
            required
            className="input-field"
            value={data?.date || ''}
            onChange={(e) => onChange('date', e.target.value)}
          />
        </FormField>

        <FormField label="Chọn công nhân chấm công" required>
          <select
            className="input-field"
            value={data?.employee_id || ''}
            onChange={(e) => {
              const empId = e.target.value;
              onChange('employee_id', empId);
              const selected = employees.find((x) => x.id === empId);
              if (selected) {
                onChange('employee_name', selected.name);
                onChange('daily_pay', selected.daily_salary);
              }
            }}
          >
            <option value="">-- Chọn công nhân --</option>
            {employees
              .filter((emp) => emp.status === 'active' || emp.id === data?.employee_id)
              .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {roleLabels[emp.role]?.label || emp.role} ({formatTien(emp.daily_salary)}/ngày)
                </option>
              ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Số ngày công" required>
            <select
              className="input-field font-mono font-bold"
              value={data?.work_shift ?? 1}
              onChange={(e) => onChange('work_shift', Number(e.target.value))}
            >
              <option value={1}>1.0 công (Cả ngày)</option>
              <option value={0.5}>0.5 công (Nửa ngày)</option>
              <option value={1.5}>1.5 công (Tăng ca)</option>
              <option value={2}>2.0 công (2 ca)</option>
              {data?.id && <option value={0}>0 công (chỉ tạm ứng)</option>}
            </select>
          </FormField>

          <FormField label="Mức lương ngày (đ/ngày)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="10000"
              className="input-field font-mono font-bold text-[var(--primary-500)]"
              value={data?.daily_pay || ''}
              onChange={(e) => onChange('daily_pay', Number(e.target.value))}
            />
          </FormField>
        </div>

        <FormField label="Giờ tăng ca (tính 150% đơn giá giờ)">
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="24"
              step="0.5"
              className="input-field pl-10 font-mono"
              value={data?.overtime_hours || ''}
              onChange={(e) => onChange('overtime_hours', Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </FormField>

        <FormField label="Tiền tạm ứng trước (nếu có)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="10000"
            className="input-field font-mono text-rose-600"
            placeholder="0"
            value={data?.advance_pay || ''}
            onChange={(e) => onChange('advance_pay', Number(e.target.value))}
          />
        </FormField>

        {/* Computed Pay Preview */}
        {(() => {
          const preview = calculateAttendancePay(data as Attendance || {});
          return (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2 text-xs">
              <div className="flex justify-between gap-3 text-[var(--text-muted)]">
                <span>Lương công</span>
                <span className="font-mono">{formatTien(preview.regular)}</span>
              </div>
              <div className="flex justify-between gap-3 text-[var(--text-muted)]">
                <span>Tăng ca 150%</span>
                <span className="font-mono">+{formatTien(preview.overtime)}</span>
              </div>
              <div className="flex justify-between gap-3 text-rose-600">
                <span>Tạm ứng</span>
                <span className="font-mono">-{formatTien(preview.advance)}</span>
              </div>
              <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-extrabold">THỰC LĨNH</span>
                <span className={cn('font-mono font-black text-base', preview.net < 0 ? 'text-amber-700' : 'text-emerald-600')}>
                  {formatTien(Math.abs(preview.net))}{preview.net < 0 ? ' (NV nợ xưởng)' : ''}
                </span>
              </div>
            </div>
          );
        })()}

        <FormField label="Trạng thái thanh toán">
          <select
            className="input-field"
            value={data?.payment_status || 'unpaid'}
            onChange={(e) => onChange('payment_status', e.target.value as PaymentStatus)}
          >
            <option value="unpaid">Chưa trả lương (Ghi nợ lương)</option>
            <option value="paid">Đã thanh toán đủ</option>
          </select>
        </FormField>

        <FormField label="Ghi chú công">
          <textarea
            className="input-field min-h-20"
            placeholder="Ghi nhận công việc xưởng phế thực hiện trong ngày..."
            value={data?.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
          />
        </FormField>

        <div className="flex justify-between items-center pt-4 border-t border-[var(--border-color)]">
          {data?.id ? (
            <button
              type="button"
              onClick={() => {
                if (data.id && onDelete) {
                  onClose();
                  onDelete(data.id);
                }
              }}
              className="py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              Xóa lượt này
            </button>
          ) : (
            <div />
          )}
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : data?.id ? 'Cập nhật' : 'Lưu lượt chấm công'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
