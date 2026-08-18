import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Package, Clock, DollarSign, Printer } from 'lucide-react';
import { formatTien, formatNgay, formatKg, cn } from '../lib/utils';
import { Modal, FormField } from '../components/Modal';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { printPhieuNhap } from '../lib/print';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { SortableHeader } from '../components/SortableHeader';
import { sortRows } from '../lib/sort';
import { PeriodFilter } from '../components/PeriodFilter';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useDateRange } from '../hooks/useDateRange';
import { importsService } from '../services/importsService';
import { contactsService } from '../services/contactsService';
import { sortByDateDesc } from '../lib/storage';
import type { Import, ImportType, PaymentStatus, ProcessingStatus } from '../types';
import { today } from '../lib/date';

interface NhapPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

export const NhapPhePage: React.FC<NhapPhePageProps> = ({ actionRef }) => {
  const { range, setRange } = useDateRange();
  const [importTypeFilter, setImportTypeFilter] = useState<'all' | 'nvl' | 'thanh_pham'>('all');

  // Lọc ngay ở truy vấn: chỉ kéo về phiếu trong kỳ đang xem, không phải cả lịch sử.
  const {
    data: imports,
    loading,
    error,
    refetch,
  } = useAsyncList(() => importsService.getAll({ from: range.from, to: range.to }), [range.from, range.to]);
  const { data: contacts } = useAsyncList(contactsService.getAll, []);

  const suppliers = useMemo(() => {
    return contacts.filter((c) => c.type === 'supplier' || !c.type);
  }, [contacts]);

  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });
  const [selectedDetail, setSelectedDetail] = useState<Import | null>(null);

  // Table Controls
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    sortConfig,
    handleSort,
  } = useTableControls();

  // Form State
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Import>({
    initialData: {
      date: today(),
      material_type: 'Tấm nhựa nano',
      import_type: 'nvl',
      quantity_kg: 0,
      price_per_kg: 4000,
      payment_status: 'paid',
      processing_status: 'pending',
    },
  });

  const handleOpenNewModal = React.useCallback(() => {
    openModal({
      date: today(),
      material_type: importTypeFilter === 'thanh_pham' ? 'Phế thành phẩm' : 'Phế nhựa NVL',
      import_type: importTypeFilter === 'thanh_pham' ? 'thanh_pham' : 'nvl',
      quantity_kg: 0,
      price_per_kg: 4000,
      payment_status: 'paid',
      processing_status: 'pending',
    });
  }, [openModal, importTypeFilter]);

  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (actionRef) actionRef.current = handleOpenNewModal;
  });

  React.useEffect(() => {
    if (searchParams.get('open') === 'true') {
      handleOpenNewModal();
      const params = new URLSearchParams(window.location.search);
      if (params.has('open')) {
        params.delete('open');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, handleOpenNewModal]);

  const filteredData = useMemo(() => {
    const list = imports.filter((item) => {
      const type = item.import_type || 'nvl';
      if (importTypeFilter !== 'all' && type !== importTypeFilter) return false;
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
  }, [imports, searchQuery, importTypeFilter]);

  // Calculated Stats (Cập nhật theo loại phế đang lọc)
  const stats = useMemo(() => {
    const filteredForStats =
      importTypeFilter === 'all'
        ? imports
        : imports.filter((i) => (i.import_type || 'nvl') === importTypeFilter);

    const totalKg = filteredForStats.reduce((acc, item) => acc + (Number(item.quantity_kg) || 0), 0);
    const totalLots = filteredForStats.length;
    const pendingLots = filteredForStats.filter((i) => i.processing_status === 'pending').length;
    const unpaidAmount = filteredForStats
      .filter((i) => i.payment_status === 'unpaid')
      .reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

    return { totalKg, totalLots, pendingLots, unpaidAmount };
  }, [imports, importTypeFilter]);

  // Trang hiện tại, dùng chung cho bảng (desktop) và card (mobile) để hai
  // chế độ hiển thị không bao giờ lệch nhau.
  const sortedData = useMemo(() => sortRows(filteredData, sortConfig), [filteredData, sortConfig]);

  const pageItems = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const data = formState.data;
    const qty = Number(data.quantity_kg) || 0;
    const price = Number(data.price_per_kg) || 0;

    if (qty <= 0) {
      toast.warning('Vui lòng nhập khối lượng lớn hơn 0 kg');
      return;
    }

    setSaving(true);
    try {
      const selectedContact = suppliers.find((s) => s.id === data.contact_id);
      const contactName = selectedContact ? selectedContact.name : data.contact_name || 'Khách lẻ';
      const importType: ImportType = data.import_type || 'nvl';

      if (data.id) {
        await importsService.update(data.id, {
          ...data,
          import_type: importType,
          contact_name: contactName,
          total_amount: qty * price,
        });
        toast.success('Đã cập nhật phiếu nhập');
      } else {
        await importsService.create({
          date: data.date || today(),
          contact_id: data.contact_id || undefined,
          contact_name: contactName,
          material_type: data.material_type || (importType === 'thanh_pham' ? 'Phế thành phẩm' : 'Phế nhựa NVL'),
          import_type: importType,
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
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu nhập');
      console.error('Lỗi khi lưu phiếu nhập:', err);
    } finally {
      setSaving(false);
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
    <div className="space-y-6 animate-fade-in">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="card p-2.5 sm:p-4 flex items-center space-x-2.5 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Tổng nhập trong kỳ
            </p>
            <p className="text-sm sm:text-xl font-black font-mono leading-tight text-[var(--text-primary)] [overflow-wrap:anywhere]">
              {formatKg(stats.totalKg)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2.5 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Số lượng lô
            </p>
            <p className="text-sm sm:text-xl font-black font-mono leading-tight text-[var(--text-primary)] [overflow-wrap:anywhere]">
              {stats.totalLots}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2.5 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Chưa xay
            </p>
            <p className="text-sm sm:text-xl font-black font-mono leading-tight text-amber-600 [overflow-wrap:anywhere]">
              {stats.pendingLots} lô
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 flex items-center space-x-2.5 sm:space-x-4 bg-[var(--bg-surface)] min-w-0">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-bold uppercase truncate">
              Chưa thanh toán
            </p>
            <p className="text-sm sm:text-xl font-black font-mono leading-tight text-rose-600 [overflow-wrap:anywhere]">
              {formatTien(stats.unpaidAmount)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-color)] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setImportTypeFilter('all')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'all'
                ? 'bg-[var(--primary-500)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
            )}
          >
            Tất cả ({imports.length})
          </button>
          <button
            type="button"
            onClick={() => setImportTypeFilter('nvl')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'nvl'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:text-emerald-400',
            )}
          >
            <span>📦 Phế NVL</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full font-mono font-black">
              {imports.filter((i) => (i.import_type || 'nvl') === 'nvl').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setImportTypeFilter('thanh_pham')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              importTypeFilter === 'thanh_pham'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 dark:text-indigo-400',
            )}
          >
            <span>🏭 Phế Thành phẩm</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full font-mono font-black">
              {imports.filter((i) => i.import_type === 'thanh_pham').length}
            </span>
          </button>
        </div>

        <PeriodFilter range={range} onChange={setRange} />
      </div>

      {/* Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm kiếm phiếu nhập..."
        totalCount={filteredData.length}
      />

      <DataState
        loading={loading}
        error={error}
        isEmpty={filteredData.length === 0}
        emptyTitle="Chưa có phiếu nhập phế"
      >
        {/* Table */}
        <div className="erp-table-container hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Danh sách phiếu nhập phế</caption>
              <thead>
                <tr>
                  <SortableHeader sortKey="date" sortConfig={sortConfig} onSort={handleSort}>
                    Ngày nhập
                  </SortableHeader>
                  <SortableHeader sortKey="import_type" sortConfig={sortConfig} onSort={handleSort}>
                    Loại phế
                  </SortableHeader>
                  <SortableHeader sortKey="contact_name" sortConfig={sortConfig} onSort={handleSort}>
                    Người bán (NCC)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="quantity_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Số lượng (kg)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="price_per_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Giá/kg
                  </SortableHeader>
                  <SortableHeader
                    sortKey="total_amount"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Tổng tiền
                  </SortableHeader>
                  <SortableHeader sortKey="payment_status" sortConfig={sortConfig} onSort={handleSort}>
                    Thanh toán
                  </SortableHeader>
                  <SortableHeader sortKey="processing_status" sortConfig={sortConfig} onSort={handleSort}>
                    Xử lý
                  </SortableHeader>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="tr-hover cursor-pointer"
                    onClick={() => setSelectedDetail(item)}
                    title="Bấm để xem chi tiết phiếu nhập"
                  >
                    <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                      {formatNgay(item.date)}
                    </td>
                    <td className="td-cell">
                      {item.import_type === 'thanh_pham' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 whitespace-nowrap">
                          🏭 Phế TP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 whitespace-nowrap">
                          📦 Phế NVL
                        </span>
                      )}
                    </td>
                    <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                      {item.contact_name || 'Khách lẻ'}
                    </td>
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
                          className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
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

        {/* Card view cho điện thoại — bảng cuộn ngang không dùng được ở xưởng */}
        <MobileCardList
          items={pageItems.map((item) => ({
            id: item.id,
            title: item.contact_name || 'Khách lẻ',
            subtitle: `${formatNgay(item.date)} • ${item.import_type === 'thanh_pham' ? '🏭 Phế Thành phẩm' : '📦 Phế NVL'}`,
            badge: <StatusBadge status={item.payment_status} />,
            accentColor: item.import_type === 'thanh_pham' ? '#6366f1' : item.processing_status === 'pending' ? '#f59e0b' : '#10b981',
            onClick: () => setSelectedDetail(item),
            fields: [
              { label: 'Loại phế', value: item.import_type === 'thanh_pham' ? 'Phế Thành phẩm' : 'Phế NVL' },
              { label: 'Khối lượng', value: formatKg(item.quantity_kg) },
              { label: 'Đơn giá', value: `${formatTien(item.price_per_kg)}/kg` },
              { label: 'Thành tiền', value: formatTien(item.total_amount) },
              { label: 'Xử lý', value: <StatusBadge status={item.processing_status} /> },
            ],
          }))}
          emptyMessage="Chưa có phiếu nhập nào trong kỳ này"
        />

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
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatNgay(selectedDetail.date)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Loại phế</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.import_type === 'thanh_pham' ? '🏭 Phế Thành phẩm' : '📦 Phế Nguyên Vật Liệu'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">
                  Người bán (NCC)
                </span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.contact_name || 'Khách lẻ'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Khối lượng</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatKg(selectedDetail.quantity_kg)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">Đơn giá</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatTien(selectedDetail.price_per_kg)}/kg
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[var(--text-muted)] font-semibold uppercase">TỔNG TIỀN PHIẾU:</span>
                <span className="font-mono font-black text-base text-[var(--primary-500)]">
                  {formatTien(selectedDetail.total_amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                  THANH TOÁN
                </span>
                <StatusBadge status={selectedDetail.payment_status} />
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                  TRẠNG THÁI XAY
                </span>
                <StatusBadge status={selectedDetail.processing_status} />
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">GHI CHÚ</span>
                <p className="text-[var(--text-secondary)] italic">{selectedDetail.notes}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <AttachmentUploader refType="import" refId={selectedDetail.id} />
            </div>

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
          <FormField label="Loại phế nhập" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange('import_type', 'nvl');
                  if (!formState.data?.id && formState.data?.material_type === 'Phế thành phẩm') {
                    handleChange('material_type', 'Phế nhựa NVL');
                  }
                }}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  (formState.data?.import_type || 'nvl') === 'nvl'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <span>📦 Phế NVL</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange('import_type', 'thanh_pham');
                  if (!formState.data?.id && (formState.data?.material_type === 'Phế nhựa NVL' || formState.data?.material_type === 'Tấm nhựa nano')) {
                    handleChange('material_type', 'Phế thành phẩm');
                  }
                }}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  formState.data?.import_type === 'thanh_pham'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-600 dark:text-indigo-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <span>🏭 Phế Thành phẩm</span>
              </button>
            </div>
          </FormField>

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
              onChange={(e) => {
                const id = e.target.value;
                handleChange('contact_id', id);
                // Tự điền giá đã thoả thuận với NCC này. Chỉ áp khi phiếu đang
                // ở giá mặc định chung — nếu người nhập đã gõ giá riêng cho
                // phiếu thì không ghi đè lên con số họ vừa nhập.
                const price = suppliers.find((s) => s.id === id)?.default_price_per_kg;
                if (price && !formState.data?.id) {
                  handleChange('price_per_kg', price);
                }
              }}
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
              inputMode="decimal"
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
              inputMode="decimal"
              required
              min="0"
              className="input-field font-mono"
              placeholder="4000"
              value={formState.data?.price_per_kg || ''}
              onChange={(e) => handleChange('price_per_kg', Number(e.target.value))}
            />
          </FormField>

          {/* Computed preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG TIỀN PHIẾU NHẬP:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatTien(
                (Number(formState.data?.quantity_kg) || 0) * (Number(formState.data?.price_per_kg) || 0),
              )}
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
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu phiếu nhập'}
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
