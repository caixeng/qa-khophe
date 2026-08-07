import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Package, Clock, DollarSign, Printer } from 'lucide-react';
import { formatTien, formatNgay, formatKg } from '../lib/utils';
import { Modal, FormField } from '../components/Modal';
import { printPhieuNhap } from '../lib/print';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { importsService } from '../services/importsService';
import { contactsService } from '../services/contactsService';
import { sortByDateDesc } from '../lib/storage';
import type { Import, PaymentStatus, ProcessingStatus } from '../types';

interface NhapPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

export const NhapPhePage: React.FC<NhapPhePageProps> = ({ actionRef }) => {
  const { data: importsData, loading, error, refetch } = useAsyncData(importsService.getAll, []);
  const { data: contactsData } = useAsyncData(contactsService.getAll, []);
  
  const imports = importsData || [];
  const contacts = contactsData || [];

  const suppliers = useMemo(() => {
    return contacts.filter(c => c.type === 'supplier' || !c.type);
  }, [contacts]);

  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [selectedDetail, setSelectedDetail] = useState<Import | null>(null);

  // Table Controls
  const { searchQuery, setSearchQuery, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage } = useTableControls();

  // Form State
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Import>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      material_type: 'Tấm nhựa nano',
      quantity_kg: 0,
      price_per_kg: 4000,
      payment_status: 'paid',
      processing_status: 'pending',
    }
  });

  const [searchParams] = useSearchParams();

  if (actionRef) {
    actionRef.current = openModal;
  }

  React.useEffect(() => {
    if (searchParams.get('open') === 'true') {
      openModal();
      const params = new URLSearchParams(window.location.search);
      if (params.has('open')) {
        params.delete('open');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams]);

import { sortByDateDesc } from '../lib/storage';

  const filteredData = useMemo(() => {
    const list = imports.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const contactName = item.contact_name || '';
      return (
        contactName.toLowerCase().includes(q) ||
        item.date.includes(q) ||
        item.material_type.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    });
    return sortByDateDesc(list);
  }, [imports, searchQuery]);

  // Calculated Stats
  const stats = useMemo(() => {
    const totalKg = imports.reduce((acc, item) => acc + (Number(item.quantity_kg) || 0), 0);
    const totalLots = imports.length;
    const pendingLots = imports.filter((i) => i.processing_status === 'pending').length;
    const unpaidAmount = imports
      .filter((i) => i.payment_status === 'unpaid')
      .reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

    return { totalKg, totalLots, pendingLots, unpaidAmount };
  }, [imports]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = formState.data;
    const qty = Number(data.quantity_kg) || 0;
    const price = Number(data.price_per_kg) || 0;
    
    if (qty <= 0) {
      toast.warning('Vui lòng nhập khối lượng lớn hơn 0 kg');
      return;
    }

    try {
      const selectedContact = suppliers.find(s => s.id === data.contact_id);
      const contactName = selectedContact ? selectedContact.name : (data.contact_name || 'Khách lẻ');

      if (data.id) {
        await importsService.update(data.id, {
          ...data,
          contact_name: contactName,
          total_amount: qty * price
        });
        toast.success('Đã cập nhật phiếu nhập');
      } else {
        await importsService.create({
          date: data.date || new Date().toISOString().split('T')[0],
          contact_id: data.contact_id || undefined,
          contact_name: contactName,
          material_type: data.material_type || 'Tấm nhựa nano',
          quantity_kg: qty,
          price_per_kg: price,
          total_amount: qty * price,
          payment_status: data.payment_status || 'paid',
          processing_status: data.processing_status || 'pending',
          notes: data.notes,
        });
        toast.success('Đã thêm phiếu nhập mới');
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error('Lỗi khi lưu phiếu nhập');
      console.error('Lỗi khi lưu phiếu nhập:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await importsService.delete(confirmState.id);
      toast.success('Đã xóa phiếu nhập');
      refetch();
    } catch (err) {
      toast.error('Lỗi khi xóa phiếu nhập');
      console.error('Lỗi khi xóa phiếu nhập:', err);
    }
    setConfirmState({ isOpen: false, id: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Tổng nhập tháng</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{formatKg(stats.totalKg)}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Số lượng lô</p>
            <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{stats.totalLots}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Chưa xay</p>
            <p className="text-xl font-bold font-mono text-amber-600">{stats.pendingLots} lô</p>
          </div>
        </div>

        <div className="card p-4 flex items-center space-x-4 bg-[var(--bg-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Chưa thanh toán</p>
            <p className="text-xl font-bold font-mono text-rose-600">{formatTien(stats.unpaidAmount)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm kiếm phiếu nhập..."
        totalCount={filteredData.length}
      />

      <DataState loading={loading} error={error} isEmpty={filteredData.length === 0} emptyTitle="Chưa có phiếu nhập phế">
        {/* Table */}
        <div className="erp-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Danh sách phiếu nhập phế</caption>
              <thead>
                <tr>
                  <th scope="col" className="th-cell">Ngày nhập</th>
                  <th scope="col" className="th-cell">Người bán (NCC)</th>
                  <th className="th-cell text-right">Số lượng (kg)</th>
                  <th className="th-cell text-right">Giá/kg</th>
                  <th className="th-cell text-right">Tổng tiền</th>
                  <th scope="col" className="th-cell">Thanh toán</th>
                  <th scope="col" className="th-cell">Xử lý</th>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                  <tr
                    key={item.id}
                    className="tr-hover cursor-pointer"
                    onClick={() => setSelectedDetail(item)}
                    title="Bấm để xem chi tiết phiếu nhập"
                  >
                    <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                    <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách lẻ'}</td>
                    <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                      {formatKg(item.quantity_kg)}
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
                    <td className="td-cell">
                      <StatusBadge status={item.processing_status} />
                    </td>
                    <td className="td-cell text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Xóa phiếu"
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
        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </DataState>

      {/* Detail View Modal */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title="Chi tiết phiếu nhập phế"
      >
        {selectedDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Ngày nhập</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{formatNgay(selectedDetail.date)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Người bán (NCC)</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">{selectedDetail.contact_name || 'Khách lẻ'}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Khối lượng</span>
                <span className="font-mono font-bold text-sm text-emerald-600">{formatKg(selectedDetail.quantity_kg)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Đơn giá</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{formatTien(selectedDetail.price_per_kg)}/kg</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[var(--text-muted)] font-semibold uppercase">TỔNG TIỀN PHIẾU:</span>
                <span className="font-mono font-black text-base text-[var(--primary-500)]">{formatTien(selectedDetail.total_amount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">THANH TOÁN</span>
                <StatusBadge status={selectedDetail.payment_status} />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">TRẠNG THÁI XAY</span>
                <StatusBadge status={selectedDetail.processing_status} />
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">GHI CHÚ</span>
                <p className="text-[var(--text-secondary)] italic">{selectedDetail.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    printPhieuNhap(selectedDetail);
                  }}
                  className="btn-secondary flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In phiếu</span>
                </button>
                <button
                  onClick={() => {
                    const item = selectedDetail;
                    setSelectedDetail(null);
                    openModal(item);
                  }}
                  className="btn-primary flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
                >
                  <Edit size={15} />
                  <span>Chỉnh sửa</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const id = selectedDetail.id;
                  setSelectedDetail(null);
                  handleDelete(id);
                }}
                className="btn-danger flex items-center space-x-1.5 text-xs font-bold py-2 px-3 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Sửa phiếu nhập phế' : 'Thêm phiếu nhập phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Ngày nhập" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Người bán (Nhà cung cấp)">
            <select
              className="input-field"
              value={formState.data?.contact_id || ''}
              onChange={(e) => handleChange('contact_id', e.target.value)}
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Khối lượng (kg)" required>
            <input
              type="number"
              required
              min="1"
              step="any"
              className="input-field font-mono font-bold"
              placeholder="0"
              value={formState.data?.quantity_kg || ''}
              onChange={(e) => handleChange('quantity_kg', Number(e.target.value))}
            />
          </FormField>

          <FormField label="Đơn giá (đ/kg)" required>
            <input
              type="number"
              required
              min="0"
              className="input-field font-mono"
              placeholder="4000"
              value={formState.data?.price_per_kg || 4000}
              onChange={(e) => handleChange('price_per_kg', Number(e.target.value))}
            />
          </FormField>

          {/* Computed preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG TIỀN PHIẾU NHẬP:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatTien((Number(formState.data?.quantity_kg) || 0) * (Number(formState.data?.price_per_kg) || 0))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Thanh toán">
              <select
                className="input-field"
                value={formState.data?.payment_status || 'paid'}
                onChange={(e) => handleChange('payment_status', e.target.value as PaymentStatus)}
              >
                <option value="paid">Đã thanh toán đủ</option>
                <option value="partial">Thanh toán 1 phần</option>
                <option value="unpaid">Chưa thanh toán</option>
              </select>
            </FormField>

            <FormField label="Trạng thái xay">
              <select
                className="input-field"
                value={formState.data?.processing_status || 'pending'}
                onChange={(e) => handleChange('processing_status', e.target.value as ProcessingStatus)}
              >
                <option value="pending">Chờ xay</option>
                <option value="grinding">Đang xay</option>
                <option value="done">Hoàn thành</option>
              </select>
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
              Lưu phiếu nhập
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa phiếu nhập"
        message="Bạn có chắc chắn muốn xóa phiếu nhập phế liệu này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
