import * as React from 'react';
import { useState, useMemo } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownLeft, Wallet, Layers, CheckCircle2 } from 'lucide-react';
import { cn, formatTien, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { StatusBadge } from '../components/StatusBadge';
import { Modal, FormField } from '../components/Modal';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { paymentsService, type PaymentRefType } from '../services/paymentsService';
import { computeRemainingWithLegacyStatus } from '../lib/calc';
import { today } from '../lib/date';
import type { Import, Export } from '../types';

export const CongNoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const { can } = useAuth();
  const { toast } = useToast();
  const canRecordPayment = can('finance.record_payment');

  // Công nợ cần TOÀN BỘ lịch sử — một khoản nợ phát sinh 3 tháng trước vẫn
  // phải hiện ở đây, nên không lọc theo kỳ như các trang danh sách khác.
  const {
    data: imports,
    loading: impLoading,
    error: impError,
    refetch: refetchImports,
  } = useAsyncList(() => importsService.getAll({ all: true }), []);
  const {
    data: exports,
    loading: expLoading,
    error: expError,
    refetch: refetchExports,
  } = useAsyncList(() => exportsService.getAll({ all: true }), []);
  const {
    data: paidImports,
    loading: paidImportsLoading,
    error: paidImportsError,
    refetch: refetchPaidImports,
  } = useAsyncData(() => paymentsService.getPaidByRefType('import'), []);
  const {
    data: paidExports,
    loading: paidExportsLoading,
    error: paidExportsError,
    refetch: refetchPaidExports,
  } = useAsyncData(() => paymentsService.getPaidByRefType('export'), []);

  // Tham chiếu ổn định để useMemo bên dưới không tính lại ở mỗi lần render.
  const paidByImport = useMemo(() => paidImports ?? {}, [paidImports]);
  const paidByExport = useMemo(() => paidExports ?? {}, [paidExports]);

  const [paymentTarget, setPaymentTarget] = useState<{
    refType: PaymentRefType;
    refId: string;
    label: string;
    remaining: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk FIFO payment modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPartnerKey, setBulkPartnerKey] = useState<string>('');
  const [bulkAmount, setBulkAmount] = useState<number>(0);
  const [bulkDate, setBulkDate] = useState<string>(today());
  const [bulkMethod, setBulkMethod] = useState<'cash' | 'transfer' | 'other'>('transfer');
  const [bulkNotes, setBulkNotes] = useState<string>('');
  const [savingBulk, setSavingBulk] = useState(false);

  const openPaymentModal = (refType: PaymentRefType, refId: string, label: string, remaining: number) => {
    setPaymentTarget({ refType, refId, label, remaining });
    setPaymentAmount(remaining);
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  const reloadAll = () => {
    refetchImports();
    refetchExports();
    refetchPaidImports();
    refetchPaidExports();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    if (paymentAmount <= 0) {
      toast.warning('Số tiền thanh toán phải lớn hơn 0');
      return;
    }
    setSaving(true);
    try {
      await paymentsService.recordPayment({
        ref_type: paymentTarget.refType,
        ref_id: paymentTarget.refId,
        amount: paymentAmount,
        method: paymentMethod,
        notes: paymentNotes,
      });
      toast.success('Đã ghi nhận thanh toán');
      setPaymentTarget(null);
      reloadAll();
    } catch (err) {
      toast.error('Lỗi khi ghi nhận thanh toán');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Payables: Imports còn nợ (dựa trên số đã trả thực tế, không chỉ payment_status)
  const payables = useMemo(() => {
    return imports
      .map((i) => ({
        item: i,
        remaining: computeRemainingWithLegacyStatus(
          i.total_amount,
          paidByImport[i.id] || 0,
          i.payment_status,
        ),
      }))
      .filter((x) => x.remaining > 0);
  }, [imports, paidByImport]);

  // Receivables: Exports còn nợ
  const receivables = useMemo(() => {
    return exports
      .map((e) => ({
        item: e,
        remaining: computeRemainingWithLegacyStatus(
          e.total_amount,
          paidByExport[e.id] || 0,
          e.payment_status,
        ),
      }))
      .filter((x) => x.remaining > 0);
  }, [exports, paidByExport]);

  // Nhóm các khoản nợ theo đối tác để phục vụ Gạch nợ gộp FIFO
  const partnerGroups = useMemo(() => {
    const source = activeTab === 'receivables' ? receivables : payables;
    const map = new Map<
      string,
      {
        key: string;
        contactId: string | null;
        name: string;
        totalRemaining: number;
        items: { id: string; date: string; totalAmount: number; remaining: number }[];
      }
    >();

    for (const row of source) {
      const name = row.item.contact_name || (activeTab === 'receivables' ? 'Khách mua' : 'Khách vãng lai');
      const key = row.item.contact_id || name;
      const existing = map.get(key) ?? {
        key,
        contactId: row.item.contact_id || null,
        name,
        totalRemaining: 0,
        items: [],
      };
      existing.totalRemaining += row.remaining;
      existing.items.push({
        id: row.item.id,
        date: row.item.date,
        totalAmount: row.item.total_amount,
        remaining: row.remaining,
      });
      map.set(key, existing);
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [activeTab, receivables, payables]);

  const selectedPartnerGroup = useMemo(
    () => partnerGroups.find((g) => g.key === bulkPartnerKey) ?? partnerGroups[0] ?? null,
    [partnerGroups, bulkPartnerKey],
  );

  // Preview phân bổ FIFO
  const fifoPreview = useMemo(() => {
    if (!selectedPartnerGroup) return [];
    let budget = Math.max(0, Number(bulkAmount) || 0);
    return selectedPartnerGroup.items.map((inv) => {
      const alloc = Math.min(inv.remaining, budget);
      budget = Math.max(0, budget - alloc);
      const afterRemaining = inv.remaining - alloc;
      return {
        ...inv,
        allocated: alloc,
        afterRemaining,
        status: alloc === 0 ? 'unpaid' : afterRemaining === 0 ? 'paid' : 'partial',
      };
    });
  }, [selectedPartnerGroup, bulkAmount]);

  const openBulkModal = () => {
    const first = partnerGroups[0];
    setBulkPartnerKey(first?.key || '');
    setBulkAmount(first?.totalRemaining || 0);
    setBulkDate(today());
    setBulkMethod('transfer');
    setBulkNotes('');
    setBulkModalOpen(true);
  };

  const handlePartnerSelectChange = (newKey: string) => {
    setBulkPartnerKey(newKey);
    const found = partnerGroups.find((g) => g.key === newKey);
    if (found) {
      setBulkAmount(found.totalRemaining);
    }
  };

  const handleRecordBulkFifo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerGroup || savingBulk) return;
    if (bulkAmount <= 0) {
      toast.warning('Vui lòng nhập tổng số tiền lớn hơn 0');
      return;
    }
    setSavingBulk(true);
    try {
      const res = await paymentsService.recordBulkFifoPayment({
        contact_id: selectedPartnerGroup.contactId,
        ref_type: activeTab === 'receivables' ? 'export' : 'import',
        items: selectedPartnerGroup.items,
        totalAmount: bulkAmount,
        date: bulkDate,
        method: bulkMethod,
        notes: bulkNotes || `Thanh toán gộp ${selectedPartnerGroup.name}`,
      });
      toast.success(
        `Đã phân bổ ${formatTien(res.allocatedAmount)}đ vào ${res.settledCount} phiếu của ${selectedPartnerGroup.name}`,
      );
      setBulkModalOpen(false);
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi ghi nhận thanh toán gộp');
      console.error(err);
    } finally {
      setSavingBulk(false);
    }
  };

  const totalReceivableAmount = useMemo(
    () => receivables.reduce((sum, x) => sum + x.remaining, 0),
    [receivables],
  );
  const totalPayableAmount = useMemo(() => payables.reduce((sum, x) => sum + x.remaining, 0), [payables]);

  const totalsLoading = impLoading || expLoading || paidImportsLoading || paidExportsLoading;
  const totalsError = impError || expError || paidImportsError || paidExportsError;
  if (totalsLoading || totalsError) {
    return (
      <div className="page-shell">
        <PageHeader title="Công Nợ Đối Tác" subtitle="Đối chiếu đầy đủ phiếu và sổ thanh toán" />
        <DataState loading={totalsLoading} error={totalsError} isEmpty={false} onRetry={reloadAll}>
          <div />
        </DataState>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5 animate-fade-in">
      <PageHeader
        title="Công Nợ Đối Tác"
        subtitle="Quản lý các khoản nợ phải thu (Khách mua) và nợ phải trả (Nhà cung cấp) — tính theo số tiền đã thanh toán thực tế"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <KpiCard
          title="Tổng nợ phải thu (Khách nợ)"
          value={formatTien(totalReceivableAmount)}
          icon={ArrowUpRight}
          color="danger"
        />
        <KpiCard
          title="Tổng nợ phải trả (Nợ NCC)"
          value={formatTien(totalPayableAmount)}
          icon={ArrowDownLeft}
          color="warning"
        />
        <KpiCard
          title="Cân bằng nợ ròng"
          value={formatTien(totalReceivableAmount - totalPayableAmount)}
          icon={DollarSign}
          color="primary"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Tabs + Bulk FIFO Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-[var(--border-color)] pb-2">
        <div className="grid grid-cols-2 sm:flex sm:space-x-2">
          <button
            onClick={() => setActiveTab('receivables')}
            className={cn(
              'py-2 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
              activeTab === 'receivables'
                ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Nợ phải thu ({receivables.length})
          </button>
          <button
            onClick={() => setActiveTab('payables')}
            className={cn(
              'py-2 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
              activeTab === 'payables'
                ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Nợ phải trả ({payables.length})
          </button>
        </div>

        {canRecordPayment && partnerGroups.length > 0 && (
          <button
            type="button"
            onClick={openBulkModal}
            className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3.5 cursor-pointer"
          >
            <Layers size={15} />
            <span>
              {activeTab === 'receivables' ? 'Thu nợ gộp theo Khách (FIFO)' : 'Trả nợ gộp theo NCC (FIFO)'}
            </span>
          </button>
        )}
      </div>

      {/* Receivables Tab */}
      {activeTab === 'receivables' && (
        <DataState
          loading={expLoading || paidExportsLoading}
          error={expError || paidExportsError}
          isEmpty={receivables.length === 0}
          emptyTitle="Không có công nợ phải thu"
        >
          {/* Desktop Table */}
          <div className="erp-table-container hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Danh sách công nợ phải thu từ khách hàng</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">
                      Ngày phát sinh
                    </th>
                    <th scope="col" className="th-cell">
                      Khách hàng
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Tổng giá trị đơn
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Đã thu
                    </th>
                    <th scope="col" className="th-cell">
                      Trạng thái
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Còn phải thu
                    </th>
                    {canRecordPayment && (
                      <th scope="col" className="th-cell text-right">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map(({ item, remaining }: { item: Export; remaining: number }) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                        {formatNgay(item.date)}
                      </td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                        {item.contact_name || 'Khách mua'}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-emerald-600">
                        {formatTien(paidByExport[item.id] || 0)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell text-right font-mono font-black text-xs text-rose-600">
                        {formatTien(remaining)}
                      </td>
                      {canRecordPayment && (
                        <td className="td-cell text-right">
                          <button
                            onClick={() =>
                              openPaymentModal('export', item.id, item.contact_name || 'Khách mua', remaining)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--primary-600)] bg-[var(--primary-50)] hover:bg-[var(--primary-100)] transition-colors cursor-pointer"
                          >
                            <Wallet size={13} /> Ghi thu
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <MobileCardList
            items={receivables.map(({ item, remaining }) => ({
              id: item.id,
              title: item.contact_name || 'Khách mua phế',
              subtitle: `Ngày xuất: ${formatNgay(item.date)}`,
              badge: <StatusBadge status={item.payment_status} />,
              accentColor: '#e11d48',
              fields: [
                { label: 'Tổng đơn hàng', value: formatTien(item.total_amount) },
                {
                  label: 'Đã thu',
                  value: (
                    <span className="text-emerald-600 font-bold">
                      {formatTien(paidByExport[item.id] || 0)}
                    </span>
                  ),
                },
                {
                  label: 'Còn nợ phải thu',
                  value: <span className="text-rose-600 font-black text-sm">{formatTien(remaining)}</span>,
                },
              ],
              actions: canRecordPayment ? (
                <button
                  onClick={() =>
                    openPaymentModal('export', item.id, item.contact_name || 'Khách mua', remaining)
                  }
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--primary-500)] text-white text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
                >
                  <Wallet size={14} /> Ghi nhận khoản thu
                </button>
              ) : undefined,
            }))}
          />
        </DataState>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <DataState
          loading={impLoading || paidImportsLoading}
          error={impError || paidImportsError}
          isEmpty={payables.length === 0}
          emptyTitle="Không có công nợ phải trả"
        >
          {/* Desktop Table */}
          <div className="erp-table-container hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Danh sách công nợ phải trả cho nhà cung cấp</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">
                      Ngày nhập
                    </th>
                    <th scope="col" className="th-cell">
                      Nhà cung cấp
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Tổng tiền phiếu
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Đã trả
                    </th>
                    <th scope="col" className="th-cell">
                      Trạng thái
                    </th>
                    <th scope="col" className="th-cell text-right">
                      Còn phải trả
                    </th>
                    {canRecordPayment && (
                      <th scope="col" className="th-cell text-right">
                        Thao tác
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {payables.map(({ item, remaining }: { item: Import; remaining: number }) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                        {formatNgay(item.date)}
                      </td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                        {item.contact_name || 'Khách vãng lai'}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell text-right font-mono text-xs text-emerald-600">
                        {formatTien(paidByImport[item.id] || 0)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell text-right font-mono font-black text-xs text-amber-600">
                        {formatTien(remaining)}
                      </td>
                      {canRecordPayment && (
                        <td className="td-cell text-right">
                          <button
                            onClick={() =>
                              openPaymentModal(
                                'import',
                                item.id,
                                item.contact_name || 'Khách vãng lai',
                                remaining,
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--primary-600)] bg-[var(--primary-50)] hover:bg-[var(--primary-100)] transition-colors cursor-pointer"
                          >
                            <Wallet size={13} /> Ghi trả
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <MobileCardList
            items={payables.map(({ item, remaining }) => ({
              id: item.id,
              title: item.contact_name || 'Nhà cung cấp phế',
              subtitle: `Ngày nhập: ${formatNgay(item.date)}`,
              badge: <StatusBadge status={item.payment_status} />,
              accentColor: '#d97706',
              fields: [
                { label: 'Tổng phiếu nhập', value: formatTien(item.total_amount) },
                {
                  label: 'Đã thanh toán',
                  value: (
                    <span className="text-emerald-600 font-bold">
                      {formatTien(paidByImport[item.id] || 0)}
                    </span>
                  ),
                },
                {
                  label: 'Còn nợ phải trả',
                  value: <span className="text-amber-600 font-black text-sm">{formatTien(remaining)}</span>,
                },
              ],
              actions: canRecordPayment ? (
                <button
                  onClick={() =>
                    openPaymentModal('import', item.id, item.contact_name || 'Khách vãng lai', remaining)
                  }
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
                >
                  <Wallet size={14} /> Ghi nhận khoản trả
                </button>
              ) : undefined,
            }))}
          />
        </DataState>
      )}

      {/* Single Invoice Payment Modal */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title={`Ghi nhận thanh toán — ${paymentTarget?.label || ''}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">Còn lại trước khi ghi:</span>
            <span className="font-mono font-black text-sm text-rose-600">
              {formatTien(paymentTarget?.remaining || 0)}
            </span>
          </div>

          <FormField label="Số tiền thanh toán" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="1"
              className="input-field font-mono font-bold"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />
          </FormField>

          <FormField label="Hình thức">
            <select
              className="input-field"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer' | 'other')}
            >
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="other">Khác</option>
            </select>
          </FormField>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setPaymentTarget(null)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk FIFO Partner Payment Modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={
          activeTab === 'receivables'
            ? 'Thu công nợ gộp theo Khách hàng (FIFO)'
            : 'Trả công nợ gộp theo Nhà cung cấp (FIFO)'
        }
      >
        <form onSubmit={handleRecordBulkFifo} className="space-y-4">
          <FormField label={activeTab === 'receivables' ? 'Chọn Khách hàng' : 'Chọn Nhà cung cấp'} required>
            <select
              className="input-field font-bold"
              value={selectedPartnerGroup?.key || ''}
              onChange={(e) => handlePartnerSelectChange(e.target.value)}
            >
              {partnerGroups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.name} — {g.items.length} phiếu ({formatTien(g.totalRemaining)}đ)
                </option>
              ))}
            </select>
          </FormField>

          {selectedPartnerGroup && (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-semibold">
                Tổng dư nợ ({selectedPartnerGroup.items.length} phiếu):
              </span>
              <span className="font-mono font-black text-sm text-rose-600">
                {formatTien(selectedPartnerGroup.totalRemaining)}đ
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Tổng số tiền thanh toán (VNĐ)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="1"
                max={selectedPartnerGroup?.totalRemaining}
                className="input-field font-mono font-bold text-emerald-600"
                value={bulkAmount || ''}
                onChange={(e) => setBulkAmount(Number(e.target.value))}
              />
            </FormField>

            <FormField label="Ngày thanh toán" required>
              <input
                type="date"
                required
                className="input-field"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Hình thức">
              <select
                className="input-field"
                value={bulkMethod}
                onChange={(e) => setBulkMethod(e.target.value as 'cash' | 'transfer' | 'other')}
              >
                <option value="transfer">Chuyển khoản ngân hàng</option>
                <option value="cash">Tiền mặt</option>
                <option value="other">Khác</option>
              </select>
            </FormField>

            <FormField label="Ghi chú chứng từ / Ủy nhiệm chi">
              <input
                type="text"
                className="input-field"
                placeholder="VD: UNC Vietcombank đợt 1..."
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
              />
            </FormField>
          </div>

          {/* Bảng xem trước phân bổ FIFO */}
          {fifoPreview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Dự kiến phân bổ tự động từ phiếu cũ nhất (FIFO):
              </p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border-color)] divide-y divide-[var(--border-color)] text-xs">
                {fifoPreview.map((row) => (
                  <div
                    key={row.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 bg-[var(--bg-surface)]"
                  >
                    <div>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {formatNgay(row.date)}
                      </span>
                      <span className="text-[var(--text-muted)] ml-2">Nợ: {formatTien(row.remaining)}đ</span>
                    </div>
                    <div className="text-right font-mono">
                      {row.allocated > 0 ? (
                        <span className="font-bold text-emerald-600">
                          Gạch {formatTien(row.allocated)}đ{' '}
                          {row.afterRemaining === 0 ? '(Đủ)' : `(Còn ${formatTien(row.afterRemaining)}đ)`}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Chưa phân bổ</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setBulkModalOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={savingBulk} className="btn-primary disabled:opacity-60">
              {savingBulk ? 'Đang phân bổ...' : 'Xác nhận gạch nợ FIFO'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
