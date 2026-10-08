import { useState } from 'react';
import { Modal, FormField } from './Modal';
import { DataState } from './DataState';
import { useAsyncList } from '../hooks/useAsyncData';
import { advanceReconciliationService } from '../services/advanceReconciliationService';
import { useToast } from '../contexts/toast';
import { formatTien } from '../lib/utils';
import type { Advance } from '../types';

export function AdvanceReconciliationModal({
  advance,
  onClose,
  onSaved,
}: {
  advance: Advance;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    data: targets,
    loading,
    error,
    refetch,
  } = useAsyncList(
    () => advanceReconciliationService.getTargets(advance),
    [advance.id, advance.purpose, advance.employee_id],
  );
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const linked = targets.filter((row) => row.source === advance.id);
  const available = targets.filter((row) => !row.source);
  const missingEmployee = advance.purpose === 'payroll' && !advance.employee_id;
  async function save() {
    if (saving || !selected) return;
    setSaving(true);
    try {
      if (selected === 'payroll_new') await advanceReconciliationService.reconcile(advance.id, 'payroll_new');
      else {
        const target = available.find((row) => row.id === selected);
        if (!target) throw new Error('Chọn chứng từ để đối soát.');
        await advanceReconciliationService.reconcile(advance.id, target.kind, target.id);
      }
      toast.success('Đã đối soát; chứng từ không được cộng thêm lần nữa.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không đối soát được');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal isOpen onClose={onClose} title={`Đối soát tiền ứng — ${advance.person || 'Chưa ghi tên'}`}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Còn chưa đối soát: <b>{formatTien(Number(advance.outstanding_amount) || 0)}đ</b>. Chọn chứng từ đã
          ghi nhận khoản dùng từ tiền ứng. Phần mềm kiểm tra mục đích, nhân sự và không cho đối soát vượt tiền
          ứng.
        </p>
        {missingEmployee && (
          <p className="text-xs text-amber-700">
            Sửa phiếu ứng và chọn hồ sơ nhân sự trước khi đối soát vào bảng lương.
          </p>
        )}
        <DataState loading={loading} error={error} isEmpty={false} onRetry={() => void refetch()}>
          {linked.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-[var(--border-color)] p-3 flex gap-2 justify-between items-center"
            >
              <span className="text-xs">Đã đối soát: {row.label}</span>
              <button
                type="button"
                disabled={saving}
                className="btn-secondary text-xs shrink-0"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await advanceReconciliationService.unlink(row);
                    onSaved();
                    onClose();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Không gỡ được đối soát');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Gỡ liên kết
              </button>
            </div>
          ))}
          <FormField label="Chứng từ dùng tiền ứng">
            <select
              className="input-field"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={missingEmployee || saving}
            >
              <option value="">Chọn chứng từ đã có</option>
              {available.map((row) => (
                <option
                  key={row.id}
                  value={row.id}
                  disabled={row.amount > Number(advance.outstanding_amount)}
                >
                  {row.label}
                </option>
              ))}
              {advance.purpose === 'payroll' &&
                !linked.length &&
                !available.length &&
                Number(advance.outstanding_amount) > 0 && (
                  <option value="payroll_new">Tạo lượt ứng trong bảng lương (chưa ghi nhận trước đó)</option>
                )}
            </select>
          </FormField>
          {selected === 'payroll_new' && (
            <p className="text-xs text-amber-700">
              Chỉ dùng khi khoản này chưa có trong chấm công. Phần mềm tạo lượt 0 công, 0 lương, trừ phần ứng
              còn lại vào lương tháng của đúng nhân sự.
            </p>
          )}
          {!available.length && advance.purpose !== 'payroll' && (
            <p className="text-xs text-[var(--text-muted)]">
              Chưa có chứng từ phù hợp. Ghi phiếu chi hoặc thanh toán phiếu nhập trước, rồi quay lại đối soát.
            </p>
          )}
        </DataState>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selected || saving || loading || !!error || missingEmployee}
            onClick={() => void save()}
          >
            {saving ? 'Đang lưu...' : 'Đối soát'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
