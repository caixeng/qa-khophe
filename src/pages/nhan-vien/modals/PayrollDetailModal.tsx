import React from 'react';
import { Modal } from '../../../components/Modal';
import { DollarSign, Edit, Trash2 } from 'lucide-react';
import { formatTien, formatNgay } from '../../../lib/utils';
import { calculateAttendancePay } from '../../../lib/payroll';
import type { Attendance } from '../../../types';

interface PayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollMonth: string;
  detailRow: any; // Mapped row from computePayroll
  detailAtt: Attendance[]; // Filtered attendance for this employee
  onRequestPayrollSettlement: (employeeId: string, name: string) => void;
  onOpenAdvPayModal: (employeeId: string, name: string) => void;
  onOpenAttModal: (att: Attendance) => void;
  onDeleteAttendance: (id: string) => void;
}

export const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({
  isOpen,
  onClose,
  payrollMonth,
  detailRow,
  detailAtt,
  onRequestPayrollSettlement,
  onOpenAdvPayModal,
  onOpenAttModal,
  onDeleteAttendance,
}) => {
  if (!detailRow) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết lương tháng ${payrollMonth}`}
    >
      <div className="space-y-4">
        <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div>
            <span className="text-[var(--text-muted)] block">Tổng công</span>
            <b className="font-mono text-sm text-[var(--text-primary)]">{detailRow.shifts} công</b>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">Tăng ca</span>
            <b className="font-mono text-sm text-purple-600">{detailRow.overtime_hours} giờ</b>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">Lương gộp</span>
            <b className="font-mono text-sm text-[var(--text-primary)]">{formatTien(detailRow.gross)}</b>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">Đã tạm ứng</span>
            <b className="font-mono text-sm text-amber-600">-{formatTien(detailRow.advance)}</b>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block">Thực lĩnh còn nợ</span>
            <b className="font-mono text-sm text-rose-600">{formatTien(detailRow.unpaid)}</b>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
            Nhật ký chấm công & ứng tiền ({detailAtt.length} lượt)
          </h4>
          <div className="flex items-center gap-2">
            {detailRow.unpaid > 0 && detailRow.employee_id && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestPayrollSettlement(detailRow.employee_id, detailRow.name);
                }}
                className="tap-target px-2.5 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Chốt đã trả
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdvPayModal(detailRow.employee_id, detailRow.name);
              }}
              className="tap-target px-2.5 text-xs font-black text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800 rounded-lg hover:bg-amber-400 cursor-pointer flex items-center gap-1"
            >
              <DollarSign size={13} />
              + Ứng lương
            </button>
          </div>
        </div>

        {detailAtt.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">
            Chưa có nhật ký chấm công chi tiết trong tháng này.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {detailAtt.map((att: Attendance) => (
              <div
                key={att.id}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold font-mono text-[var(--text-primary)]">
                    {formatNgay(att.date)}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {att.work_shift > 0 ? `${att.work_shift} công (${formatTien(att.daily_pay)}/ngày)` : 'Chỉ tạm ứng tiền'}
                    {att.notes ? ` • ${att.notes}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    {(att.advance_pay || 0) > 0 && (
                      <span className="block text-amber-600 font-bold text-[11px]">
                        Ứng -{formatTien(att.advance_pay || 0)}
                      </span>
                    )}
                    <span className="block font-black text-emerald-600">
                      {formatTien(Math.max(0, calculateAttendancePay(att).net))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAttModal(att);
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                      title="Sửa"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteAttendance(att.id);
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
