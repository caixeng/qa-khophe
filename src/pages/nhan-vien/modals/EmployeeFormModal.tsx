import React from 'react';
import { Modal, FormField } from '../../../components/Modal';
import { today } from '../../../lib/date';
import type { Employee, EmployeeRole } from '../../../types';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Partial<Employee> | null;
  saving: boolean;
  onChange: (field: keyof Employee, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  data,
  saving,
  onChange,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={data?.id ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm mới nhân viên xưởng phế'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Họ và tên nhân viên" required>
          <input
            type="text"
            required
            className="input-field font-bold"
            placeholder="Ví dụ: Hoa, Em Hoàn, Anh Danh..."
            value={data?.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Chức vụ / Công việc" required>
            <select
              className="input-field"
              value={data?.role || 'grinder'}
              onChange={(e) => onChange('role', e.target.value as EmployeeRole)}
            >
              <option value="grinder">Thợ xay phế</option>
              <option value="weigher">Thợ cân phế</option>
              <option value="driver">Tài xế giao hàng</option>
              <option value="manager">Quản lý xưởng</option>
              <option value="staff">Nhân viên khác</option>
            </select>
          </FormField>

          <FormField label="Đơn giá lương công (đ/ngày)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              step="10000"
              className="input-field font-mono font-bold"
              placeholder="350000"
              value={data?.daily_salary || ''}
              onChange={(e) => onChange('daily_salary', Number(e.target.value))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Ngày vào làm">
            <input
              type="date"
              max={today()}
              className="input-field font-mono"
              value={data?.join_date || ''}
              onChange={(e) => onChange('join_date', e.target.value)}
            />
          </FormField>

          <FormField label="Địa chỉ">
            <input
              type="text"
              className="input-field"
              placeholder="Địa chỉ liên hệ"
              value={data?.address || ''}
              onChange={(e) => onChange('address', e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Số điện thoại liên hệ">
            <input
              type="tel"
              className="input-field font-mono"
              placeholder="0912..."
              value={data?.phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
            />
          </FormField>

          <FormField label="Trạng thái làm việc">
            <select
              className="input-field"
              value={data?.status || 'active'}
              onChange={(e) => onChange('status', e.target.value as 'active' | 'inactive')}
            >
              <option value="active">Đang làm việc</option>
              <option value="inactive">Đã nghỉ việc</option>
            </select>
          </FormField>
        </div>

        <FormField label="Ghi chú thêm">
          <textarea
            className="input-field min-h-20"
            placeholder="Nhập ghi chú kỹ năng, tay nghề thợ..."
            value={data?.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
          <button type="button" onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : data?.id ? 'Cập nhật' : 'Thêm nhân viên'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
