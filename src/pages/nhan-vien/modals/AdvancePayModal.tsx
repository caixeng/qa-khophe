import React from 'react';
import { Modal, FormField } from '../../../components/Modal';
import { formatTien } from '../../../lib/utils';
import type { Employee } from '../../../types';

interface AdvancePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    employeeId: string;
    employeeName: string;
    amount: number;
    date: string;
    notes: string;
  };
  saving: boolean;
  employees: Employee[];
  onChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdvancePayModal: React.FC<AdvancePayModalProps> = ({
  isOpen,
  onClose,
  data,
  saving,
  employees,
  onChange,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phiếu ứng lương nhân viên"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Chọn nhân viên ứng lương" required>
          <select
            className="input-field font-bold"
            value={data.employeeId || ''}
            onChange={(e) => {
              const empId = e.target.value;
              const emp = employees.find((x) => x.id === empId);
              onChange({
                ...data,
                employeeId: empId,
                employeeName: emp ? emp.name : '',
              });
            }}
          >
            <option value="">-- Chọn nhân viên --</option>
            {employees.filter((emp) => emp.status === 'active').map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({formatTien(emp.daily_salary)}/ngày)
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Ngày ứng lương" required>
          <input
            type="date"
            required
            className="input-field font-mono"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
        </FormField>

        <FormField label="Số tiền tạm ứng (đ)" required>
          <input
            type="number"
            inputMode="numeric"
            required
            min="10000"
            step="10000"
            className="input-field font-mono font-black text-lg text-rose-600"
            placeholder="Ví dụ: 500000"
            value={data.amount || ''}
            onChange={(e) => onChange({ ...data, amount: Number(e.target.value) || 0 })}
          />
        </FormField>

        <FormField label="Ghi chú ứng lương">
          <input
            type="text"
            className="input-field text-xs"
            placeholder="Ví dụ: Tạm ứng lương giữa tháng..."
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-black disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Xác nhận ứng lương'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
