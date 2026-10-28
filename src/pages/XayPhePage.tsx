import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Scissors, TrendingDown, Factory, ChevronDown, Check, Search } from 'lucide-react';
import { cn, formatNgay, formatKg, formatPhanTram } from '../lib/utils';
import { Modal, FormField } from '../components/Modal';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { PeriodFilter } from '../components/PeriodFilter';
import { SortableHeader } from '../components/SortableHeader';
import { sortRows } from '../lib/sort';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useDateRange } from '../hooks/useDateRange';
import { grindingService } from '../services/grindingService';
import { importsService } from '../services/importsService';
import { settingsService } from '../services/settingsService';
import { sortByDateDesc } from '../lib/storage';
import type { Grinding } from '../types';
import { lossCategoryLabels, type LossCategory } from '../lib/loss';
import { today } from '../lib/date';

interface XayPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

export const XayPhePage: React.FC<XayPhePageProps> = ({ actionRef }) => {
  const { can } = useAuth();
  const canEditDelete = can('scrap.edit_delete');
  const { range, setRange } = useDateRange();
  // Lọc ngay ở truy vấn: chỉ kéo về phiếu trong kỳ đang xem.
  const {
    data: grindingList,
    loading,
    error,
    refetch,
  } = useAsyncList(() => grindingService.getAll({ from: range.from, to: range.to }), [range.from, range.to]);
  const { data: allGrindingList, refetch: refetchAllGrinding } = useAsyncList(
    () => grindingService.getAll({ all: true }),
    [],
  );
  const { data: importsList, refetch: refetchImports } = useAsyncList(
    () => importsService.getAll({ importType: 'nvl', all: true }),
    [],
  );
  const { data: kgPerBagData } = useAsyncData(settingsService.getKgPerBag, []);
  const { data: lossThreshold } = useAsyncData(settingsService.getLossWarning, []);
  const kgPerBag = kgPerBagData ?? 900;

  const importsById = useMemo(() => {
    const map: Record<string, (typeof importsList)[number]> = {};
    for (const imp of importsList) {
      map[imp.id] = imp;
    }
    return map;
  }, [importsList]);

  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: '',
  });
  const [selectedDetail, setSelectedDetail] = useState<Grinding | null>(null);

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
  const { formState, openModal, closeModal, handleChange } = useCrudForm<Grinding>({
    initialData: {
      date: today(),
      input_qty_kg: 0,
      output_qty_kg: 0,
      bags_count: 0,
      worker: 'Hoa',
    },
  });
  const inputManuallyEditedRef = React.useRef(false);
  const [lotDropdownOpen, setLotDropdownOpen] = useState(false);
  const [lotSearch, setLotSearch] = useState('');
  const lotDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (formState.isOpen) {
      inputManuallyEditedRef.current = Boolean(
        formState.data?.id || (Number(formState.data?.input_qty_kg) || 0) > 0,
      );
      setLotDropdownOpen(false);
      setLotSearch('');
    }
  }, [formState.isOpen, formState.data?.id]);

  React.useEffect(() => {
    if (!lotDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (lotDropdownRef.current && !lotDropdownRef.current.contains(e.target as Node)) {
        setLotDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [lotDropdownOpen]);

  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (actionRef) actionRef.current = openModal;
  });

  React.useEffect(() => {
    if (searchParams.get('open') === 'true') {
      const fromSessionId = searchParams.get('fromSessionId');
      const bagsParam = Number(searchParams.get('bags')) || 0;
      const kgParam = Number(searchParams.get('kg')) || 0;
      const dateParam = searchParams.get('date') || today();

      if (kgParam > 0) {
        const estimatedInput = Math.round(kgParam * 1.025);
        openModal({
          date: dateParam,
          input_qty_kg: estimatedInput,
          output_qty_kg: kgParam,
          bags_count: bagsParam || Math.round(kgParam / kgPerBag),
          worker: 'Anh Tam',
          loss_category: 'machine',
          notes: fromSessionId ? `Chốt sản lượng từ phiên cân #${fromSessionId.slice(0, 8)}` : undefined,
        });
      } else {
        openModal();
      }
      const params = new URLSearchParams(window.location.search);
      ['open', 'fromSessionId', 'bags', 'kg', 'date'].forEach((k) => params.delete(k));
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, openModal, kgPerBag]);

  const filteredData = useMemo(() => {
    const list = grindingList.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const opName = item.worker || '';
      return (
        item.date.includes(q) ||
        opName.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        (item.import_id || '').toLowerCase().includes(q)
      );
    });
    return sortByDateDesc(list);
  }, [grindingList, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalInput = grindingList.reduce((sum, item) => sum + (Number(item.input_qty_kg) || 0), 0);
    const totalOutput = grindingList.reduce((sum, item) => sum + (Number(item.output_qty_kg) || 0), 0);
    const totalLossKg = totalInput - totalOutput;
    const avgLossPct = totalInput > 0 ? (totalLossKg / totalInput) * 100 : 0;
    const completedLots = grindingList.filter((g) => (Number(g.output_qty_kg) || 0) > 0).length;

    return { totalInput, totalOutput, totalLossKg, avgLossPct, completedLots };
  }, [grindingList]);

  // Trang hiện tại, dùng chung cho bảng (desktop) và card (mobile) để hai
  // chế độ hiển thị không bao giờ lệch nhau.
  const sortedData = useMemo(() => sortRows(filteredData, sortConfig), [filteredData, sortConfig]);

  const pageItems = useMemo(
    () => sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedData, currentPage, itemsPerPage],
  );

  // Tính lượng phế đã đưa vào xay và lượng còn tồn của từng Lô nhập gốc (Điều 9 Quy chế)
  const lotAvailabilityMap = useMemo(() => {
    const editingId = formState.data?.id;
    const usedByImportId: Record<string, number> = {};
    const sourceGrinding = allGrindingList.length > 0 ? allGrindingList : grindingList;
    for (const g of sourceGrinding) {
      if (!g.import_id || g.id === editingId) continue;
      usedByImportId[g.import_id] = (usedByImportId[g.import_id] || 0) + (Number(g.input_qty_kg) || 0);
    }

    const map: Record<string, { totalKg: number; usedKg: number; remainingKg: number }> = {};
    for (const imp of importsList) {
      const totalKg = Number(imp.quantity_kg) || 0;
      const usedKg = usedByImportId[imp.id] || 0;
      const remainingKg = Math.max(0, Number((totalKg - usedKg).toFixed(2)));
      map[imp.id] = { totalKg, usedKg, remainingKg };
    }
    return map;
  }, [importsList, allGrindingList, grindingList, formState.data?.id]);

  const selectableImports = useMemo(() => {
    const currentImportId = formState.data?.import_id;
    return importsList.filter((imp) => {
      if (imp.import_type === 'thanh_pham') return false;
      if (imp.id === currentImportId) return true;
      // Ẩn các lô đã đánh dấu "Hoàn thành" ở trang Nhập phế liệu
      if (imp.processing_status === 'done') return false;
      const avail = lotAvailabilityMap[imp.id];
      const remKg = avail ? avail.remainingKg : Number(imp.quantity_kg) || 0;
      // Lô đang ở trạng thái "Đang xay" luôn hiển thị trong danh sách
      if (imp.processing_status === 'grinding') return true;
      return remKg > 0;
    });
  }, [importsList, lotAvailabilityMap, formState.data?.import_id]);

  const selectedLotAvailability = formState.data?.import_id
    ? lotAvailabilityMap[formState.data.import_id]
    : undefined;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — mỗi lần bấm thêm là một phiếu trùng.
    if (saving) return;
    const data = formState.data as any;
    const inputKg = Number(data.input_qty_kg) || 0;
    const outputKg = Number(data.output_qty_kg) || 0;

    if (inputKg <= 0) {
      toast.warning('Khối lượng đầu vào phải lớn hơn 0 kg');
      return;
    }

    const lotAvail = data.import_id ? lotAvailabilityMap[data.import_id] : undefined;
    if (lotAvail && inputKg > lotAvail.remainingKg) {
      toast.warning(
        `Khối lượng đưa vào (${formatKg(inputKg)}) vượt quá lượng còn lại của lô nhập (${formatKg(lotAvail.remainingKg)})`,
      );
      return;
    }

    if (inputKg > outputKg && (!data.loss_category || data.loss_category === 'unclassified')) {
      toast.warning('Chọn nguyên nhân hao hụt trước khi lưu');
      return;
    }
    setSaving(true);
    try {
      if (data.id) {
        await grindingService.update(data.id, data);
        toast.success('Đã cập nhật phiếu xay');
      } else {
        await grindingService.create({
          date: data.date || today(),
          import_id: data.import_id,
          input_qty_kg: inputKg,
          output_qty_kg: outputKg,
          bags_count: Number(data.bags_count) || Math.round(outputKg / kgPerBag),
          worker: data.worker || 'Hoa',
          notes: data.notes,
          loss_category: data.loss_category,
          loss_notes: data.loss_notes,
        });
        toast.success('Đã thêm phiếu xay mới');
      }
      closeModal();
      refetch();
      void refetchAllGrinding();
      void refetchImports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu xay');
      console.error('Lỗi khi lưu phiếu xay:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await grindingService.delete(confirmState.id);
      toast.success('Đã xóa phiếu xay');
      refetch();
      void refetchAllGrinding();
      void refetchImports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xoá phiếu xay');
      console.error('Lỗi khi xóa phiếu xay:', err);
    }
    setConfirmState({ isOpen: false, id: '' });
  };

  return (
    <div className="space-y-2.5 sm:space-y-5 animate-fade-in">
      {stats.avgLossPct > (lossThreshold ?? 5) && (
        <div role="alert" className="card p-2.5 sm:p-3 text-xs sm:text-sm text-amber-700">
          Hao hụt xay {formatPhanTram(stats.avgLossPct)} vượt ngưỡng {lossThreshold ?? 5}%. Kiểm tra cân và
          nguyên nhân từng phiếu.
        </div>
      )}
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-4 min-w-0">
          <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Scissors className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Tổng xay trong kỳ
            </p>
            <p className="text-xs sm:text-xl font-mono font-black leading-tight text-[var(--text-primary)] truncate">
              {formatKg(stats.totalInput)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-4 min-w-0">
          <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Factory className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Đầu ra thành phẩm
            </p>
            <p className="text-xs sm:text-xl font-mono font-black leading-tight text-emerald-600 truncate">
              {formatKg(stats.totalOutput)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-4 min-w-0">
          <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
            <TrendingDown className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              Tổng hao hụt
            </p>
            <p className="text-xs sm:text-xl font-mono font-black leading-tight text-rose-600 truncate">
              {formatKg(stats.totalLossKg)}
            </p>
          </div>
        </div>

        <div className="card p-2.5 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-4 min-w-0">
          <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-[var(--primary-500)]/10 text-[var(--primary-500)] shrink-0">
            <Scissors className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] truncate">
              % Hao hụt trung bình
            </p>
            <p className="text-xs sm:text-xl font-mono font-black leading-tight text-[var(--primary-500)] truncate">
              {formatPhanTram(stats.avgLossPct)}
            </p>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <PeriodFilter range={range} onChange={setRange} />

      <TableToolbar
        placeholder="Tìm theo thợ xay, ghi chú hoặc lô nhập..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredData.length}
      />

      {/* Main Data Table */}
      <DataState loading={loading} error={error} isEmpty={filteredData.length === 0}>
        <div className="card hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Danh sách phiếu xay phế</caption>
              <thead>
                <tr>
                  <SortableHeader sortKey="date" sortConfig={sortConfig} onSort={handleSort}>
                    Ngày xay
                  </SortableHeader>
                  <th scope="col" className="th-cell">
                    Lô phế nhập
                  </th>
                  <SortableHeader
                    sortKey="input_qty_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Đầu vào (kg)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="output_qty_kg"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Đầu ra (kg)
                  </SortableHeader>
                  <SortableHeader sortKey="loss_kg" sortConfig={sortConfig} onSort={handleSort} align="right">
                    Hao hụt (kg)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="loss_pct"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    % Hao hụt
                  </SortableHeader>
                  <SortableHeader
                    sortKey="bags_count"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    align="right"
                  >
                    Số bao
                  </SortableHeader>
                  <SortableHeader sortKey="worker" sortConfig={sortConfig} onSort={handleSort}>
                    Thợ xay
                  </SortableHeader>
                  <th className="th-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const inputKg = Number(item.input_qty_kg) || 0;
                  const outputKg = Number(item.output_qty_kg) || 0;
                  const lossKg = item.loss_kg !== undefined ? item.loss_kg : inputKg - outputKg;
                  const lossPct = item.loss_pct ?? (inputKg > 0 ? (lossKg / inputKg) * 100 : 0);

                  return (
                    <tr
                      key={item.id}
                      className="tr-hover cursor-pointer"
                      onClick={() => setSelectedDetail(item)}
                      title="Bấm để xem chi tiết mẻ xay"
                    >
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                        {formatNgay(item.date)}
                      </td>
                      <td className="td-cell text-xs">
                        {item.import_id ? (
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">
                              {importsById[item.import_id]?.contact_name || 'Lô nhập'}
                            </span>
                            <span className="block font-mono text-[11px] text-[var(--primary-500)]">
                              #{item.import_id.slice(0, 8)}
                              {importsById[item.import_id]?.date
                                ? ` · ${formatNgay(importsById[item.import_id].date)}`
                                : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Chưa gắn lô
                          </span>
                        )}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatKg(inputKg)}
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-emerald-600">
                        {outputKg > 0 ? (
                          formatKg(outputKg)
                        ) : (
                          <span className="text-amber-500 font-normal italic">Đang xay...</span>
                        )}
                      </td>
                      <td className="td-cell text-right font-mono text-xs">
                        <span
                          className={cn(lossKg > 50 ? 'text-rose-600 font-bold' : 'text-[var(--text-muted)]')}
                        >
                          {lossKg > 0 ? `-${formatKg(lossKg)}` : `${formatKg(Math.abs(lossKg))}`}
                        </span>
                      </td>
                      <td className="td-cell text-right font-mono text-xs">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-bold text-[11px]',
                            lossPct > 5
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200',
                          )}
                        >
                          {formatPhanTram(lossPct)}
                        </span>
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {item.bags_count ? `${item.bags_count} bao` : '—'}
                      </td>
                      <td className="td-cell font-medium text-xs text-[var(--text-primary)]">
                        {item.worker || 'Hoa'}
                      </td>
                      <td className="td-cell text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          {canEditDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="icon-action text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Xóa phiếu xay"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
            title: `Xay ${formatKg(item.output_qty_kg || 0)}`,
            subtitle: `${formatNgay(item.date)} · Thợ ${item.worker || '—'}`,
            accentColor: (item.loss_pct || 0) > 10 ? '#f43f5e' : '#10b981',
            onClick: () => setSelectedDetail(item),
            fields: [
              { label: 'Đầu vào', value: formatKg(item.input_qty_kg || 0) },
              { label: 'Ra thành phẩm', value: formatKg(item.output_qty_kg || 0) },
              { label: 'Hao hụt', value: formatKg(item.loss_kg || 0) },
              { label: 'Tỷ lệ hao', value: formatPhanTram(item.loss_pct || 0) },
            ],
          }))}
          emptyMessage="Chưa có phiếu xay nào trong kỳ này"
        />

        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </DataState>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedDetail} onClose={() => setSelectedDetail(null)} title="Chi tiết phiếu xay phế">
        {selectedDetail &&
          (() => {
            const inputKg = Number(selectedDetail.input_qty_kg) || 0;
            const outputKg = Number(selectedDetail.output_qty_kg) || 0;
            const lossKg = selectedDetail.loss_kg !== undefined ? selectedDetail.loss_kg : inputKg - outputKg;
            const lossPct = selectedDetail.loss_pct ?? (inputKg > 0 ? (lossKg / inputKg) * 100 : 0);

            return (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">NGÀY XAY</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {formatNgay(selectedDetail.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      LÔ PHẾ NHẬP
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--primary-500)]">
                      {selectedDetail.import_id || 'Lô vãng lai'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">ĐẦU VÀO</span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {formatKg(inputKg)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      ĐẦU RA THÀNH PHẨM
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-600">{formatKg(outputKg)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">HAO HỤT</span>
                    <span className="font-mono font-bold text-sm text-rose-600">
                      {formatKg(lossKg)} ({formatPhanTram(lossPct)})
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      SỐ BAO THÀNH PHẨM
                    </span>
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {selectedDetail.bags_count || 0} bao
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-[var(--border-color)]">
                    <span className="text-[var(--text-muted)] block font-semibold uppercase">
                      THỢ PHỤ TRÁCH XAY
                    </span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {selectedDetail.worker || 'Hoa'}
                    </span>
                  </div>
                </div>

                <p className="text-xs">
                  Nguyên nhân hao hụt:{' '}
                  <b>{lossCategoryLabels[selectedDetail.loss_category || 'unclassified']}</b>
                  {selectedDetail.loss_notes && ' · ' + selectedDetail.loss_notes}
                </p>
                {selectedDetail.notes && (
                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                    <span className="text-[var(--text-muted)] block font-semibold uppercase mb-1">
                      GHI CHÚ
                    </span>
                    <p className="text-[var(--text-secondary)] italic">{selectedDetail.notes}</p>
                  </div>
                )}

                {canEditDelete && (
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] gap-2">
                    <button
                      onClick={() => {
                        const item = selectedDetail;
                        setSelectedDetail(null);
                        openModal(item);
                      }}
                      className="btn-primary flex items-center space-x-1.5 text-xs font-bold py-2 px-4 cursor-pointer"
                    >
                      <Edit size={15} />
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      onClick={() => {
                        const id = selectedDetail.id;
                        setSelectedDetail(null);
                        handleDelete(id);
                      }}
                      className="btn-danger flex items-center space-x-1.5 text-xs font-bold py-2 px-4 cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={formState.isOpen}
        onClose={closeModal}
        title={formState.data?.id ? 'Chỉnh sửa phiếu xay phế' : 'Ghi phiếu xay phế mới'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Ngày xay phế" required>
            <input
              type="date"
              required
              className="input-field"
              value={formState.data?.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Lô phế nhập gốc (NVL) — Không bắt buộc">
            <div ref={lotDropdownRef} className="relative">
              {(() => {
                const selectedImp = formState.data?.import_id
                  ? importsById[formState.data.import_id]
                  : undefined;
                const selAvail = selectedImp ? lotAvailabilityMap[selectedImp.id] : undefined;
                const selRemKg = selAvail
                  ? selAvail.remainingKg
                  : Number(selectedImp?.quantity_kg) || 0;
                const q = lotSearch.trim().toLowerCase();
                const filteredLots = q
                  ? selectableImports.filter(
                      (imp) =>
                        (imp.contact_name || '').toLowerCase().includes(q) ||
                        (imp.material_type || '').toLowerCase().includes(q) ||
                        (imp.collector_name || '').toLowerCase().includes(q) ||
                        formatNgay(imp.date).toLowerCase().includes(q),
                    )
                  : selectableImports;

                const selectLot = (impId: string) => {
                  handleChange('import_id', impId);
                  const currentOut = Number((formState.data as any)?.output_qty_kg) || 0;
                  if (!inputManuallyEditedRef.current && currentOut > 0) {
                    handleChange('input_qty_kg' as any, currentOut);
                  }
                  setLotDropdownOpen(false);
                };

                return (
                  <>
                    <button
                      type="button"
                      aria-label="Chọn lô phế nhập gốc"
                      onClick={() => setLotDropdownOpen((v) => !v)}
                      className="input-field w-full flex items-center justify-between gap-2 text-left text-xs py-2 px-3 cursor-pointer"
                    >
                      {selectedImp ? (
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          {formatNgay(selectedImp.date)} — {selectedImp.contact_name || 'Khách lẻ'}{' '}
                          <span className="text-[var(--text-secondary)]">
                            ({selectedImp.material_type})
                          </span>{' '}
                          ·{' '}
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Còn {formatKg(selRemKg)}/{formatKg(selectedImp.quantity_kg)}
                          </span>
                        </span>
                      ) : (
                        <span className="truncate text-[var(--text-secondary)]">
                          -- Không chọn lô (Xay gộp / Không rõ lô gốc) --
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150',
                          lotDropdownOpen && 'rotate-180',
                        )}
                      />
                    </button>

                    {lotDropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl overflow-hidden">
                        {selectableImports.length > 4 && (
                          <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                              <input
                                type="text"
                                value={lotSearch}
                                onChange={(e) => setLotSearch(e.target.value)}
                                placeholder="Tìm nhanh NCC, ngày, loại phế..."
                                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        )}

                        <div className="max-h-56 overflow-y-auto overscroll-contain divide-y divide-[var(--border-subtle)]">
                          <button
                            type="button"
                            onClick={() => selectLot('')}
                            className={cn(
                              'w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer',
                              !formState.data?.import_id
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                                : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
                            )}
                          >
                            <span>-- Không chọn lô (Xay gộp / Không rõ lô gốc) --</span>
                            {!formState.data?.import_id && (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </button>

                          {filteredLots.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                              Không tìm thấy lô phù hợp
                            </div>
                          ) : (
                            filteredLots.map((imp) => {
                              const avail = lotAvailabilityMap[imp.id];
                              const remKg = avail ? avail.remainingKg : Number(imp.quantity_kg) || 0;
                              const isSelected = formState.data?.import_id === imp.id;
                              return (
                                <button
                                  key={imp.id}
                                  type="button"
                                  onClick={() => selectLot(imp.id)}
                                  className={cn(
                                    'w-full px-3 py-2 text-left transition-colors cursor-pointer flex items-center justify-between gap-2',
                                    isSelected
                                      ? 'bg-emerald-500/10'
                                      : 'hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-subtle)]',
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                        {formatNgay(imp.date)} — {imp.contact_name || 'Khách lẻ'}
                                      </span>
                                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                        Còn {formatKg(remKg)} / {formatKg(imp.quantity_kg)}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] truncate">
                                      <span className="truncate">{imp.material_type}</span>
                                      {imp.collector_name && (
                                        <>
                                          <span>•</span>
                                          <span className="shrink-0">{imp.collector_name}</span>
                                        </>
                                      )}
                                      {imp.processing_status === 'grinding' && (
                                        <span className="ml-auto shrink-0 px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                          Đang xay
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {selectedLotAvailability && (
              <div className="mt-1.5 px-3 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  Tổng lô gốc:{' '}
                  <strong className="font-mono">{formatKg(selectedLotAvailability.totalKg)}</strong>
                </span>
                <span className="text-[var(--text-secondary)]">
                  Đã xay: <strong className="font-mono">{formatKg(selectedLotAvailability.usedKg)}</strong>
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  Còn lại khả dụng:{' '}
                  <strong className="font-mono">{formatKg(selectedLotAvailability.remainingKg)}</strong>
                </span>
                {selectedLotAvailability.remainingKg > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      inputManuallyEditedRef.current = true;
                      handleChange('input_qty_kg' as any, selectedLotAvailability.remainingKg);
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors cursor-pointer"
                  >
                    Xay hết tồn lô ({formatKg(selectedLotAvailability.remainingKg)})
                  </button>
                )}
              </div>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Đầu vào phế thô (kg)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="1"
                max={
                  selectedLotAvailability && selectedLotAvailability.remainingKg > 0
                    ? selectedLotAvailability.remainingKg
                    : undefined
                }
                step="any"
                className="input-field font-mono font-bold"
                placeholder="Tự khớp theo đầu ra"
                value={(formState.data as any)?.input_qty_kg || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  inputManuallyEditedRef.current = val > 0;
                  handleChange('input_qty_kg' as any, val);
                }}
              />
            </FormField>

            <FormField label="Đầu ra bột xay (kg)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="0"
                step="any"
                className="input-field font-mono font-bold text-emerald-600"
                placeholder="0"
                value={(formState.data as any)?.output_qty_kg || ''}
                onChange={(e) => {
                  const outKg = Number(e.target.value);
                  handleChange('output_qty_kg' as any, outKg);
                  handleChange('bags_count', outKg > 0 ? Math.round(outKg / kgPerBag) : 0);
                  if (!inputManuallyEditedRef.current) {
                    handleChange('input_qty_kg' as any, outKg);
                  }
                }}
              />
            </FormField>
          </div>

          <FormField
            label="Nguyên nhân hao hụt"
            required={
              (Number(formState.data?.input_qty_kg) || 0) > (Number(formState.data?.output_qty_kg) || 0)
            }
          >
            <select
              aria-label="Nguyên nhân hao hụt"
              className="input-field"
              value={formState.data?.loss_category || 'unclassified'}
              onChange={(e) => handleChange('loss_category', e.target.value as LossCategory)}
            >
              {Object.entries(lossCategoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Diễn giải hao hụt" required={formState.data?.loss_category === 'other'}>
            <input
              aria-label="Diễn giải hao hụt"
              className="input-field"
              required={formState.data?.loss_category === 'other'}
              value={formState.data?.loss_notes || ''}
              onChange={(e) => handleChange('loss_notes', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số bao thành phẩm">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className="input-field font-mono"
                placeholder={`Tự động tính theo ~${kgPerBag}kg/bao`}
                value={formState.data?.bags_count || ''}
                onChange={(e) => handleChange('bags_count', Number(e.target.value))}
              />
            </FormField>

            <FormField label="Thợ phụ trách xay">
              <input
                type="text"
                className="input-field"
                placeholder="Ví dụ: Hoa, Hoàn..."
                value={(formState.data as any)?.worker || ''}
                onChange={(e) => handleChange('worker' as any, e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú mẻ xay">
            <textarea
              className="input-field min-h-20"
              placeholder="Nhập ghi chú thêm nếu có..."
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
              {saving ? 'Đang lưu...' : formState.data?.id ? 'Cập nhật' : 'Tạo phiếu xay'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '' })}
        onConfirm={confirmDelete}
        title="Xóa phiếu xay"
        message="Bạn có chắc chắn muốn xóa phiếu xay này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
