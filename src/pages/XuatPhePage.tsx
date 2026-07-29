import * as React from 'react';
import { useMemo } from 'react';
import { Plus, Edit, Trash2, Truck, DollarSign, Package, TrendingUp } from 'lucide-react';
import { cn, formatTien, formatNgay, formatKg } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { exportsService } from '../services/exportsService';
import { contactsService } from '../services/contactsService';
import type { Export as ExportType, PaymentStatus } from '../types';

export const XuatPhePage: React.FC = () => {
  const { data: exportsData, loading, error, refetch } = useAsyncData(exportsService.getAll, []);
  const { data: contactsData } = useAsyncData(contactsService.getAll, []);

  const exports = exportsData || [];
  const contacts = contactsData || [];

  const customers = useMemo(() => {
    return contacts.filter(c => c.type === 'customer' || !c.type);
  }, [contacts]);

  // Table controls
  const { searchQuery, setSearchQuery } = useTableControls();

  // Form state
  const { formState, openModal, closeModal, handleChange } = useCrudForm<ExportType>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      bags_count: 20,
      total_quantity_kg: 18000,
      price_per_kg: 6000,
      payment_status: 'paid',
    }
  });

  const filteredData = useMemo(() => {
    return exports.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.contact_name || '').toLowerCase().includes(q) ||
        item.date.includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    });
  }, [exports, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalKg = exports.reduce((acc, item) => acc + (Number(item.total_quantity_kg) || 0), 0);
    const totalBags = exports.reduce((acc, item) => acc + (Number(item.bags_count) || 0), 0);
    const totalRevenue = exports.reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);
    const unpaidAmount = exports
      .filter((e) => e.payment_status === 'unpaid')
      .reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

    return { totalKg, totalBags, totalRevenue, unpaidAmount };
  }, [exports]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = formState.data;
    const qty = Number(data.total_quantity_kg) || 0;
    const price = Number(data.price_per_kg) || 0;

    if (qty <= 0) {
      alert('Số lượng xuất phải lớn hơn 0 kg');
      return;
    }

    try {
      const selectedCustomer = customers.find(c => c.id === data.contact_id);
      const contactName = selectedCustomer ? selectedCustomer.name : (data.contact_name || 'Khách lẻ');

      if (data.id) {
        await exportsService.update(data.id, {
          ...data,
          contact_name: contactName,
          total_amount: qty * price
        });
      } else {
        await exportsService.create({
          date: data.date || new Date().toISOString().split('T')[0],
          contact_id: data.contact_id || null,
          contact_name: contactName,
          bags_count: Number(data.bags_count) || 0,
          total_quantity_kg: qty,
          price_per_kg: price,
          total_amount: qty * price,
          payment_status: data.payment_status || 'unpaid',
          notes: data.notes,
        });
      }
      closeModal();
      refetch();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu xuất:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu xuất này?')) {
      try {
        await exportsService.delete(id);
        refetch();
      } catch (err) {
        console.error('Lỗi khi xóa phiếu xuất:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader
        title="Xuất Phế Liệu"
        subtitle="Quản lý xuất bán phế/bột nhựa tái sinh cho nhà máy & khách hàng"
        action={{
          label: 'Thêm phiếu xuất',
          icon: Plus,
          onClick: () => openModal(),
        }}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Tổng xuất tháng</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
              {formatKg(stats.totalKg)} ({stats.totalBags} bao)
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Doanh thu tháng</p>
            <p className="text-xl font-bold font-mono text-emerald-600">{formatTien(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Chưa thu tiền</p>
            <p className="text-xl font-bold font-mono text-rose-600">{formatTien(stats.unpaidAmount)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Số đơn xuất</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{exports.length} đơn</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm phiếu xuất (khách mua, ngày)..."
        totalCount={filteredData.length}
      />

      <DataState loading={loading} error={error} isEmpty={filteredData.length === 0} emptyTitle="Chưa có phiếu xuất hàng">
        {/* Table */}
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th-cell">Ngày xuất</th>
                  <th className="th-cell">Khách hàng mua</th>
                  <th className="th-cell text-right">Số bao</th>
                  <th className="th-cell text-right">Tổng kg</th>
                  <th className="th-cell text-right">Giá/kg</th>
                  <th className="th-cell text-right">Tổng tiền</th>
                  <th className="th-cell">Thanh toán</th>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="tr-hover">
                    <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                    <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách mua lẻ'}</td>
                    <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">{item.bags_count || 0} bao</td>
                    <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                      {formatKg(item.total_quantity_kg)}
                    </td>
                    <td className="td-cell text-right font-mono text-xs text-[var(--text-muted)]">
                      {formatTien(item.price_per_kg)}
                    </td>
                    <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                      {formatTien(item.total_amount)}
                    </td>
                    <td className="td-cell">
                      <StatusBadge status={item.payment_status} />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Sửa phiếu xuất phế' : 'Thêm phiếu xuất phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Ngày xuất" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Khách hàng mua">
            <select
              className="input-field"
              value={formState.data?.contact_id || ''}
              onChange={(e) => handleChange('contact_id', e.target.value)}
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.address ? `(${c.address})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số bao xuất">
              <input
                type="number"
                min="1"
                className="input-field font-mono"
                placeholder="20"
                value={formState.data?.bags_count || ''}
                onChange={(e) => {
                  const bags = Number(e.target.value);
                  handleChange('bags_count', bags);
                  if (!formState.data?.total_quantity_kg) {
                    handleChange('total_quantity_kg', bags * 900);
                  }
                }}
              />
            </FormField>

            <FormField label="Tổng khối lượng (kg)" required>
              <input
                type="number"
                required
                min="1"
                step="any"
                className="input-field font-mono font-bold"
                placeholder="18000"
                value={formState.data?.total_quantity_kg || ''}
                onChange={(e) => handleChange('total_quantity_kg', Number(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="Giá bán (đ/kg)" required>
            <input
              type="number"
              required
              min="0"
              className="input-field font-mono"
              placeholder="6000"
              value={formState.data?.price_per_kg || 6000}
              onChange={(e) => handleChange('price_per_kg', Number(e.target.value))}
            />
          </FormField>

          {/* Computed Preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG GIÁ TRỊ XUẤT HÀNG:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatTien((Number(formState.data?.total_quantity_kg) || 0) * (Number(formState.data?.price_per_kg) || 0))}
            </span>
          </div>

          <FormField label="Trạng thái thanh toán">
            <select
              className="input-field"
              value={formState.data?.payment_status || 'unpaid'}
              onChange={(e) => handleChange('payment_status', e.target.value as PaymentStatus)}
            >
              <option value="paid">Đã thanh toán đủ</option>
              <option value="partial">Thanh toán 1 phần</option>
              <option value="unpaid">Chưa thanh toán (Ghi nợ)</option>
            </select>
          </FormField>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              placeholder="Ghi chú xuất hàng..."
              value={formState.data?.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu phiếu xuất
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
