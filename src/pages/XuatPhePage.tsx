import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Truck, DollarSign, Package, TrendingUp, Printer } from 'lucide-react';
import { formatTien, formatNgay, formatKg, cn } from '../lib/utils';
import { Modal, FormField } from '../components/Modal';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { PeriodFilter } from '../components/PeriodFilter';
import { SortableHeader } from '../components/SortableHeader';
import { sortRows } from '../lib/sort';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useDateRange } from '../hooks/useDateRange';
import { exportsService } from '../services/exportsService';
import { contactsService } from '../services/contactsService';
import { settingsService } from '../services/settingsService';
import { weighingService } from '../services/weighingService';
import { sortByDateDesc } from '../lib/storage';
import { printPhieuXuat } from '../lib/print';
import type { Export as ExportType, PaymentStatus } from '../types';
import { today } from '../lib/date';

interface XuatPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

export const XuatPhePage: React.FC<XuatPhePageProps> = ({ actionRef }) => {
  const { range, setRange } = useDateRange();
  const [exportTypeFilter, setExportTypeFilter] = useState<'all' | 'thanh_pham' | 'nvl'>('all');

  // Lọc ngay ở truy vấn: chỉ kéo về phiếu trong kỳ đang xem.
  const {
    data: exports,
    loading: expLoading,
    error: expError,
    refetch,
  } = useAsyncList(() => exportsService.getAll({ from: range.from, to: range.to }), [range.from, range.to]);
  const { data: contacts } = useAsyncList(contactsService.getAll, []);
  const { data: kgPerBagData } = useAsyncData(settingsService.getKgPerBag, []);
  const { data: weighingSessions } = useAsyncList(weighingService.getSessions, []);
  const { data: unlinkedSessionIds } = useAsyncData(weighingService.getUnlinkedSessionIds, []);

  const kgPerBag = kgPerBagData ?? 900;
  const customers = useMemo(
    () => contacts.filter((c) => c.type === 'customer' || c.type === 'partner' || c.type === 'supplier'),
    [contacts],
  );

  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });
  const [selectedDetail, setSelectedDetail] = useState<ExportType | null>(null);

  // Table controls
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
  const { formState, openModal, closeModal, handleChange } = useCrudForm<ExportType>({
    initialData: {
      date: today(),
      export_type: 'thanh_pham',
      bags_count: 18,
      total_kg: 16200,
      price_per_kg: 6000,
      payment_status: 'unpaid',
    },
  });

  const handleOpenNewModal = React.useCallback(() => {
    openModal({
      date: today(),
      export_type: exportTypeFilter === 'nvl' ? 'nvl' : 'thanh_pham',
      bags_count: 18,
      total_kg: 16200,
      price_per_kg: 6000,
      payment_status: 'unpaid',
    });
  }, [openModal, exportTypeFilter]);

  // Phiên cân chọn được: chưa gắn phiếu xuất nào, HOẶC đang là phiên đã gắn
  // với đúng phiếu đang sửa (không thì mở phiếu cũ ra sẽ không thấy lựa chọn
  // hiện tại của nó trong danh sách).
  const availableSessions = useMemo(() => {
    const currentId = (formState.data as any)?.weighing_session_id;
    return weighingSessions.filter((s) => unlinkedSessionIds?.has(s.id) || s.id === currentId);
  }, [weighingSessions, unlinkedSessionIds, formState.data]);

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
    const list = exports.filter((item) => {
      const type = item.export_type || 'thanh_pham';
      if (exportTypeFilter !== 'all' && type !== exportTypeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.date.includes(q) ||
        (item.contact_name || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    });
    return sortByDateDesc(list);
  }, [exports, searchQuery, exportTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    const filteredForStats =
      exportTypeFilter === 'all'
        ? exports
        : exports.filter((e) => (e.export_type || 'thanh_pham') === exportTypeFilter);

    const totalKg = filteredForStats.reduce((acc, item) => acc + (Number(item.total_kg) || 0), 0);
    const totalBags = filteredForStats.reduce((acc, item) => acc + (Number(item.bags_count) || 0), 0);
    const totalRevenue = filteredForStats.reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);
    const unpaidAmount = filteredForStats
      .filter((e) => e.payment_status === 'unpaid')
      .reduce((acc, item) => acc + (Number(item.total_amount) || 0), 0);

    return { totalKg, totalBags, totalRevenue, unpaidAmount };
  }, [exports, exportTypeFilter]);

  // Trang hiện tại, dùng chung cho bảng (desktop) và card (mobile) để hai
  // chế độ hiển thị không bao giờ lệch nhau.
  const sortedData = useMemo(() => sortRows(filteredData, sortConfig), [filteredData, sortConfig]);

  const pageItems = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — mỗi lần bấm thêm là một phiếu trùng.
    if (saving) return;
    const data = formState.data as any;
    const qty = Number(data.total_kg) || 0;
    const price = Number(data.price_per_kg) || 0;

    if (qty <= 0) {
      toast.warning('Số lượng xuất phải lớn hơn 0 kg');
      return;
    }

    setSaving(true);
    try {
      const selectedCustomer = customers.find((c) => c.id === data.contact_id);
      const contactName = selectedCustomer ? selectedCustomer.name : data.contact_name || 'Khách lẻ';

      if (data.id) {
        await exportsService.update(data.id, {
          ...data,
          export_type: data.export_type || 'thanh_pham',
          contact_name: contactName,
          total_kg: qty,
          total_amount: qty * price,
        });
        toast.success('Đã cập nhật phiếu xuất');
      } else {
        await exportsService.create({
          date: data.date || today(),
          contact_id: data.contact_id || undefined,
          contact_name: contactName,
          export_type: data.export_type || 'thanh_pham',
          bags_count: Number(data.bags_count) || 0,
          total_kg: qty,
          price_per_kg: price,
          total_amount: qty * price,
          payment_status: (data.payment_status as PaymentStatus) || 'unpaid',
          weighing_session_id: data.weighing_session_id || undefined,
          notes: data.notes,
        });
        toast.success('Đã thêm phiếu xuất mới');
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu xuất');
      console.error('Lỗi khi lưu phiếu xuất:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await exportsService.delete(confirmState.id);
      toast.success('Đã xóa phiếu xuất');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xoá phiếu xuất');
      console.error('Lỗi khi xóa phiếu xuất:', err);
    }
    setConfirmState({ isOpen: false, id: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-4 min-w-0">
          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
            <Truck className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Tổng khối lượng xuất
            </p>
            <p className="text-sm sm:text-xl font-mono font-black leading-tight text-[var(--text-primary)] [overflow-wrap:anywhere]">
              {formatKg(stats.totalKg)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-4 min-w-0">
          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Package className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Tổng số bao xuất
            </p>
            <p className="text-sm sm:text-xl font-mono font-black leading-tight text-[var(--text-primary)] [overflow-wrap:anywhere]">{stats.totalBags} bao</p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-4 min-w-0">
          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Doanh thu xuất phế
            </p>
            <p className="text-sm sm:text-xl font-mono font-black leading-tight text-emerald-600 [overflow-wrap:anywhere]">{formatTien(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-4 min-w-0">
          <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Chưa thu (Công nợ)
            </p>
            <p className="text-sm sm:text-xl font-mono font-black leading-tight text-rose-600 [overflow-wrap:anywhere]">{formatTien(stats.unpaidAmount)}</p>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-color)] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setExportTypeFilter('all')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              exportTypeFilter === 'all'
                ? 'bg-[var(--primary-500)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
            )}
          >
            Tất cả ({exports.length})
          </button>
          <button
            type="button"
            onClick={() => setExportTypeFilter('thanh_pham')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              exportTypeFilter === 'thanh_pham'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-blue-400',
            )}
          >
            <span>🏭 Xuất Thành phẩm</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full font-mono font-black">
              {exports.filter((e) => (e.export_type || 'thanh_pham') === 'thanh_pham').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExportTypeFilter('nvl')}
            className={cn(
              'tap-target sm:min-h-0 sm:min-w-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
              exportTypeFilter === 'nvl'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 dark:text-amber-400',
            )}
          >
            <span>📦 Xuất Phế NVL (Thô)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full font-mono font-black">
              {exports.filter((e) => e.export_type === 'nvl').length}
            </span>
          </button>
        </div>

        <PeriodFilter range={range} onChange={setRange} />
      </div>

      <TableToolbar
        placeholder="Tìm theo khách mua, ngày xuất hoặc ghi chú..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredData.length}
      />

      {/* Main Data Table */}
      <DataState loading={expLoading} error={expError} isEmpty={filteredData.length === 0}>
        <div className="card hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Danh sách phiếu xuất phế</caption>
              <thead>
                <tr>
                  <SortableHeader sortKey="date" sortConfig={sortConfig} onSort={handleSort}>
                    Ngày xuất
                  </SortableHeader>
                  <SortableHeader sortKey="export_type" sortConfig={sortConfig} onSort={handleSort}>
                    Loại phế
                  </SortableHeader>
                  <SortableHeader sortKey="contact_name" sortConfig={sortConfig} onSort={handleSort}>
                    Khách mua (Đại lý)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="bags_count"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Số bao
                  </SortableHeader>
                  <SortableHeader
                    sortKey="total_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Khối lượng (kg)
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
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const qtyKg = Number(item.total_kg) || 0;
                  return (
                    <tr
                      key={item.id}
                      className="tr-hover cursor-pointer"
                      onClick={() => setSelectedDetail(item)}
                      title="Bấm để xem chi tiết phiếu xuất"
                    >
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                        {formatNgay(item.date)}
                      </td>
                      <td className="td-cell">
                        {item.export_type === 'nvl' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 whitespace-nowrap">
                            📦 Phế NVL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 whitespace-nowrap">
                            🏭 Thành phẩm
                          </span>
                        )}
                      </td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                        {item.contact_name || 'Khách bán lẻ'}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {item.bags_count ? `${item.bags_count} bao` : '—'}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatKg(qtyKg)}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {formatTien(item.price_per_kg)}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Xóa phiếu xuất"
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

        {/* Card view cho điện thoại */}
        <MobileCardList
          items={pageItems.map((item) => ({
            id: item.id,
            title: item.contact_name || 'Khách lẻ',
            subtitle: `${formatNgay(item.date)} • ${item.export_type === 'nvl' ? '📦 Phế NVL (Thô)' : '🏭 Thành phẩm'}`,
            badge: <StatusBadge status={item.payment_status} />,
            accentColor: item.export_type === 'nvl' ? '#f59e0b' : item.payment_status === 'unpaid' ? '#f43f5e' : '#10b981',
            onClick: () => setSelectedDetail(item),
            fields: [
              { label: 'Loại phế', value: item.export_type === 'nvl' ? 'Phế NVL (Thô/Trả NCC)' : 'Thành phẩm' },
              { label: 'Số bao', value: `${item.bags_count} bao` },
              { label: 'Khối lượng', value: formatKg(item.total_kg || 0) },
              { label: 'Đơn giá', value: `${formatTien(item.price_per_kg)}/kg` },
              { label: 'Thành tiền', value: formatTien(item.total_amount) },
            ],
          }))}
          emptyMessage="Chưa có phiếu xuất nào trong kỳ này"
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
        title="Chi tiết phiếu xuất phế"
      >
        {selectedDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">NGÀY XUẤT</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatNgay(selectedDetail.date)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">LOẠI PHẾ XUẤT</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.export_type === 'nvl' ? '📦 Phế NVL (Phế thô/Trả NCC)' : '🏭 Thành phẩm (Đã xay)'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">KHÁCH MUA</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.contact_name || 'Khách bán lẻ'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">SỐ BAO XUẤT</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {selectedDetail.bags_count || 0} bao
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">
                  KHỐI LƯỢNG (KG)
                </span>
                <span className="font-mono font-bold text-sm text-blue-600">
                  {formatKg(selectedDetail.total_kg || 0)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">ĐƠN GIÁ BÁN</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                  {formatTien(selectedDetail.price_per_kg)}/kg
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block font-semibold uppercase">THANH TOÁN</span>
                <StatusBadge status={selectedDetail.payment_status} />
              </div>
              <div className="col-span-2 pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                <span className="text-[var(--text-muted)] font-semibold uppercase">
                  TỔNG GIÁ TRỊ ĐƠN XUẤT:
                </span>
                <span className="font-mono font-black text-base text-[var(--primary-500)]">
                  {formatTien(selectedDetail.total_amount)}
                </span>
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                  GHI CHÚ DỰ ÁN / XE
                </span>
                <p className="text-[var(--text-secondary)] italic">{selectedDetail.notes}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <AttachmentUploader refType="export" refId={selectedDetail.id} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    printPhieuXuat(selectedDetail);
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

      {/* Form Modal */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Chỉnh sửa phiếu xuất phế' : 'Tạo phiếu xuất phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Loại phế xuất" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('export_type' as any, 'thanh_pham')}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  ((formState.data as any)?.export_type || 'thanh_pham') === 'thanh_pham'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:border-blue-600 dark:text-blue-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <span>🏭 Xuất Thành phẩm</span>
              </button>
              <button
                type="button"
                onClick={() => handleChange('export_type' as any, 'nvl')}
                className={cn(
                  'tap-target flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  (formState.data as any)?.export_type === 'nvl'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-200 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                )}
              >
                <span>📦 Xuất Phế NVL (Thô)</span>
              </button>
            </div>
          </FormField>

          <FormField label="Ngày xuất phế" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Khách mua phế (Đại lý/Nhà máy)" required>
            <select
              className="input-field"
              value={formState.data?.contact_id || ''}
              onChange={(e) => {
                const cId = e.target.value;
                handleChange('contact_id', cId);
                const c = customers.find((x) => x.id === cId);
                if (c) handleChange('contact_name', c.name);
                // Tự điền giá đã thoả thuận với khách này; chỉ áp cho phiếu mới
                // để không ghi đè giá đã chốt trên phiếu cũ đang sửa.
                if (c?.default_price_per_kg && !formState.data?.id) {
                  handleChange('price_per_kg', c.default_price_per_kg);
                }
              }}
            >
              <option value="">-- Chọn khách hàng / đối tác --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Lấy số liệu từ phiên cân đã cân (tuỳ chọn)">
            <select
              className="input-field"
              value={(formState.data as any)?.weighing_session_id || ''}
              onChange={(e) => {
                const sessionId = e.target.value;
                handleChange('weighing_session_id' as any, sessionId || undefined);
                const s = availableSessions.find((x) => x.id === sessionId);
                if (s) {
                  handleChange('bags_count', s.total_bags);
                  handleChange('total_kg' as any, s.total_kg || 0);
                  if (s.contact_id && !formState.data?.contact_id) {
                    handleChange('contact_id', s.contact_id);
                    if (s.contact_name) handleChange('contact_name', s.contact_name);
                  }
                }
              }}
            >
              <option value="">-- Không gắn, tự nhập số liệu --</option>
              {availableSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatNgay(s.date)} — {s.total_bags} bao, {formatKg(s.total_kg || 0)}
                  {s.contact_name ? ` (${s.contact_name})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số bao xuất">
              <input
                type="number"
                inputMode="decimal"
                min="1"
                className="input-field font-mono"
                placeholder="18"
                value={formState.data?.bags_count || ''}
                onChange={(e) => {
                  const bags = Number(e.target.value);
                  handleChange('bags_count', bags);
                  if (!(formState.data as any)?.total_kg) {
                    handleChange('total_kg' as any, bags * (kgPerBag || 900));
                  }
                }}
              />
            </FormField>

            <FormField label="Tổng khối lượng (kg)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="1"
                step="any"
                className="input-field font-mono font-bold"
                placeholder="16200"
                value={(formState.data as any)?.total_kg || ''}
                onChange={(e) => handleChange('total_kg' as any, Number(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="Giá bán (đ/kg)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              className="input-field font-mono"
              placeholder="6000"
              value={formState.data?.price_per_kg || ''}
              onChange={(e) => handleChange('price_per_kg', Number(e.target.value))}
            />
          </FormField>

          {/* Computed Preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG GIÁ TRỊ XUẤT HÀNG:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatTien(
                (Number((formState.data as any)?.total_kg) || 0) *
                  (Number(formState.data?.price_per_kg) || 0),
              )}
            </span>
          </div>

          <FormField label="Trạng thái thanh toán">
            <select
              className="input-field"
              value={formState.data?.payment_status || 'unpaid'}
              onChange={(e) => handleChange('payment_status', e.target.value as PaymentStatus)}
            >
              <option value="unpaid">Chưa thanh toán (Ghi nợ)</option>
              <option value="partial">Thanh toán 1 phần</option>
              <option value="paid">Đã thanh toán đủ</option>
            </select>
          </FormField>

          <FormField label="Ghi chú đơn xuất">
            <textarea
              className="input-field min-h-20"
              placeholder="Nhập biển số xe, thông tin giao nhận..."
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
              {saving ? 'Đang lưu...' : formState.data?.id ? 'Cập nhật' : 'Tạo phiếu xuất'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa phiếu xuất"
        message="Bạn có chắc chắn muốn xóa phiếu xuất phế liệu này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
