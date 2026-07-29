import * as React from 'react';
import { useMemo } from 'react';
import { Plus, Edit, Trash2, Scissors, TrendingDown, Factory } from 'lucide-react';
import { cn, formatNgay, formatKg, formatPhanTram } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { grindingService } from '../services/grindingService';
import { importsService } from '../services/importsService';
import type { Grinding } from '../types';

export const XayPhePage: React.FC = () => {
  const { data: grindingData, loading, error, refetch } = useAsyncData(grindingService.getAll, []);
  const { data: importsData } = useAsyncData(importsService.getAll, []);

  const grindingList = grindingData || [];
  const importsList = importsData || [];

  // Table controls
  const { searchQuery, setSearchQuery } = useTableControls();

  // Form State
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Grinding>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      input_quantity_kg: 0,
      output_quantity_kg: 0,
      bags_count: 0,
      operator_name: 'Hoàn',
    }
  });

  const filteredData = useMemo(() => {
    return grindingList.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.date.includes(q) ||
        (item.operator_name || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        (item.import_id || '').toLowerCase().includes(q)
      );
    });
  }, [grindingList, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalInput = grindingList.reduce((sum, item) => sum + (Number(item.input_quantity_kg) || 0), 0);
    const totalOutput = grindingList.reduce((sum, item) => sum + (Number(item.output_quantity_kg) || 0), 0);
    const totalLossKg = totalInput - totalOutput;
    const avgLossPct = totalInput > 0 ? (totalLossKg / totalInput) * 100 : 0;
    const completedLots = grindingList.filter(g => (g.output_quantity_kg || 0) > 0).length;

    return { totalInput, totalOutput, totalLossKg, avgLossPct, completedLots };
  }, [grindingList]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = formState.data;
    const inputKg = Number(data.input_quantity_kg) || 0;
    const outputKg = Number(data.output_quantity_kg) || 0;

    if (inputKg <= 0) {
      alert('Khối lượng đầu vào phải lớn hơn 0 kg');
      return;
    }

    try {
      if (data.id) {
        await grindingService.update(data.id, data);
      } else {
        await grindingService.create({
          date: data.date || new Date().toISOString().split('T')[0],
          import_id: data.import_id || null,
          input_quantity_kg: inputKg,
          output_quantity_kg: outputKg,
          bags_count: Number(data.bags_count) || Math.round(outputKg / 25),
          operator_name: data.operator_name || 'Hoàn',
          notes: data.notes,
        });
      }
      closeModal();
      refetch();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu xay:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu xay này?')) {
      try {
        await grindingService.delete(id);
        refetch();
      } catch (err) {
        console.error('Lỗi khi xóa phiếu xay:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader
        title="Xay Phế Liệu"
        subtitle="Quản lý công đoạn xay nghiền và theo dõi tỷ lệ hao hụt phế"
        action={{
          label: 'Ghi phiếu xay',
          icon: Plus,
          onClick: () => openModal(),
        }}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Factory size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Tổng phế đã xay</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{formatKg(stats.totalOutput)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Scissors size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Số lô hoàn thành</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
              {stats.completedLots} / {grindingList.length} lô
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <TrendingDown size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Hao hụt trung bình</p>
            <p className={cn(
              "text-xl font-bold font-mono",
              stats.avgLossPct > 5 ? "text-rose-600" : "text-emerald-600"
            )}>
              {formatPhanTram(stats.avgLossPct)} ({formatKg(stats.totalLossKg)})
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm phiếu xay (ngày, người xay, mã lô)..."
        totalCount={filteredData.length}
      />

      <DataState loading={loading} error={error} isEmpty={filteredData.length === 0} emptyTitle="Chưa có thông tin phiếu xay">
        {/* Table */}
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th-cell">Ngày xay</th>
                  <th className="th-cell">Lô phế nhập</th>
                  <th className="th-cell text-right">Đầu vào (kg)</th>
                  <th className="th-cell text-right">Đầu ra (kg)</th>
                  <th className="th-cell text-right">Hao hụt (kg)</th>
                  <th className="th-cell text-right">% Hao hụt</th>
                  <th className="th-cell text-right">Số bao</th>
                  <th className="th-cell">Người xay</th>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const inputKg = Number(item.input_quantity_kg) || 0;
                  const outputKg = Number(item.output_quantity_kg) || 0;
                  const lossKg = item.loss_kg !== undefined ? item.loss_kg : (inputKg - outputKg);
                  const lossPct = item.loss_percentage !== undefined ? item.loss_percentage : (inputKg > 0 ? (lossKg / inputKg) * 100 : 0);

                  return (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                      <td className="td-cell font-mono text-xs text-[var(--primary-500)] font-bold">
                        {item.import_id ? item.import_id.slice(0, 8) : 'Lô vãng lai'}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatKg(inputKg)}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-emerald-600">
                        {outputKg > 0 ? formatKg(outputKg) : <span className="text-amber-500 font-normal italic">Đang xay...</span>}
                      </td>
                      <td className="td-cell text-right font-mono text-xs">
                        <span className={cn(lossKg > 50 ? "text-rose-600 font-bold" : "text-[var(--text-muted)]")}>
                          {lossKg > 0 ? `-${formatKg(lossKg)}` : `${formatKg(Math.abs(lossKg))}`}
                        </span>
                      </td>
                      <td className="td-cell text-right font-mono text-xs">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-bold text-[11px]",
                          lossPct > 5 ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        )}>
                          {formatPhanTram(lossPct)}
                        </span>
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {item.bags_count ? `${item.bags_count} bao` : '—'}
                      </td>
                      <td className="td-cell font-medium text-xs text-[var(--text-primary)]">
                        {item.operator_name || 'Hoàn'}
                      </td>
                      <td className="td-cell text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openModal(item)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Sửa thông tin phiếu xay' : 'Ghi phiếu xay phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Ngày xay" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Liên kết lô phế nhập">
            <select
              className="input-field"
              value={formState.data?.import_id || ''}
              onChange={(e) => {
                const impId = e.target.value;
                const imp = importsList.find(i => i.id === impId);
                handleChange('import_id', impId);
                if (imp && imp.quantity_kg) {
                  handleChange('input_quantity_kg', imp.quantity_kg);
                }
              }}
            >
              <option value="">-- Lô phế vãng lai --</option>
              {importsList.map((imp) => (
                <option key={imp.id} value={imp.id}>
                  {imp.date} - {imp.contact_name || 'Khách'} ({formatKg(imp.quantity_kg)})
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Đầu vào phế thô (kg)" required>
              <input
                type="number"
                required
                min="1"
                step="any"
                className="input-field font-mono font-bold"
                placeholder="0"
                value={formState.data?.input_quantity_kg || ''}
                onChange={(e) => handleChange('input_quantity_kg', Number(e.target.value))}
              />
            </FormField>

            <FormField label="Đầu ra bột xay (kg)" required>
              <input
                type="number"
                required
                min="0"
                step="any"
                className="input-field font-mono font-bold text-emerald-600"
                placeholder="0"
                value={formState.data?.output_quantity_kg || ''}
                onChange={(e) => {
                  const outKg = Number(e.target.value);
                  handleChange('output_quantity_kg', outKg);
                  handleChange('bags_count', Math.round(outKg / 25));
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số bao thành phẩm">
              <input
                type="number"
                min="0"
                className="input-field font-mono"
                placeholder="Tự động tính theo ~25kg/bao"
                value={formState.data?.bags_count || ''}
                onChange={(e) => handleChange('bags_count', Number(e.target.value))}
              />
            </FormField>

            <FormField label="Thợ phụ trách xay">
              <input
                type="text"
                className="input-field"
                placeholder="Ví dụ: Hoàn, Nga..."
                value={formState.data?.operator_name || 'Hoàn'}
                onChange={(e) => handleChange('operator_name', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              placeholder="Ghi chú thêm..."
              value={formState.data?.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu phiếu xay
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
