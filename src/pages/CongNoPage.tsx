import * as React from 'react';
import { useState, useMemo } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
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
import type { Import, Export } from '../types';

export const CongNoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const { user } = useAuth();
  const { toast } = useToast();
  const canRecordPayment = user?.role === 'manager' || user?.role === 'admin';

  const { data: imports, loading: impLoading, error: impError, refetch: refetchImports } = useAsyncList(importsService.getAll, []);
  const { data: exports, loading: expLoading, error: expError, refetch: refetchExports } = useAsyncList(exportsService.getAll, []);
  const { data: paidImports, refetch: refetchPaidImports } = useAsyncData(() => paymentsService.getPaidByRefType('import'), []);
  const { data: paidExports, refetch: refetchPaidExports } = useAsyncData(() => paymentsService.getPaidByRefType('export'), []);

  // Tham chiếu ổn định để useMemo bên dưới không tính lại ở mỗi lần render.
  const paidByImport = useMemo(() => paidImports ?? {}, [paidImports]);
  const paidByExport = useMemo(() => paidExports ?? {}, [paidExports]);

  const [paymentTarget, setPaymentTarget] = useState<{ refType: PaymentRefType; refId: string; label: string; remaining: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openPaymentModal = (refType: PaymentRefType, refId: string, label: string, remaining: number) => {
    setPaymentTarget({ refType, refId, label, remaining });
    setPaymentAmount(remaining);
    setPaymentMethod('cash');
    setPaymentNotes('');
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
      refetchImports();
      refetchExports();
      refetchPaidImports();
      refetchPaidExports();
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
      .map((i) => ({ item: i, remaining: computeRemainingWithLegacyStatus(i.total_amount, paidByImport[i.id] || 0, i.payment_status) }))
      .filter((x) => x.remaining > 0);
  }, [imports, paidByImport]);

  // Receivables: Exports còn nợ
  const receivables = useMemo(() => {
    return exports
      .map((e) => ({ item: e, remaining: computeRemainingWithLegacyStatus(e.total_amount, paidByExport[e.id] || 0, e.payment_status) }))
      .filter((x) => x.remaining > 0);
  }, [exports, paidByExport]);

  const totalReceivableAmount = useMemo(() => receivables.reduce((sum, x) => sum + x.remaining, 0), [receivables]);
  const totalPayableAmount = useMemo(() => payables.reduce((sum, x) => sum + x.remaining, 0), [payables]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Công Nợ Đối Tác"
        subtitle="Quản lý các khoản nợ phải thu (Khách mua) và nợ phải trả (Nhà cung cấp) — tính theo số tiền đã thanh toán thực tế"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('receivables')}
          className={cn(
            'pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
            activeTab === 'receivables'
              ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          Nợ phải thu khách hàng ({receivables.length})
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={cn(
            'pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer',
            activeTab === 'payables'
              ? 'border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          Nợ phải trả nhà cung cấp ({payables.length})
        </button>
      </div>

      {/* Receivables Tab */}
      {activeTab === 'receivables' && (
        <DataState loading={expLoading} error={expError} isEmpty={receivables.length === 0} emptyTitle="Không có công nợ phải thu">
          {/* Desktop Table */}
          <div className="erp-table-container hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Danh sách công nợ phải thu từ khách hàng</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">Ngày phát sinh</th>
                    <th scope="col" className="th-cell">Khách hàng</th>
                    <th scope="col" className="th-cell text-right">Tổng giá trị đơn</th>
                    <th scope="col" className="th-cell text-right">Đã thu</th>
                    <th scope="col" className="th-cell">Trạng thái</th>
                    <th scope="col" className="th-cell text-right">Còn phải thu</th>
                    {canRecordPayment && <th scope="col" className="th-cell text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map(({ item, remaining }: { item: Export; remaining: number }) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách mua'}</td>
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
                            onClick={() => openPaymentModal('export', item.id, item.contact_name || 'Khách mua', remaining)}
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
                { label: 'Đã thu', value: <span className="text-emerald-600 font-bold">{formatTien(paidByExport[item.id] || 0)}</span> },
                { label: 'Còn nợ phải thu', value: <span className="text-rose-600 font-black text-sm">{formatTien(remaining)}</span> },
              ],
              actions: canRecordPayment ? (
                <button
                  onClick={() => openPaymentModal('export', item.id, item.contact_name || 'Khách mua', remaining)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--primary-500)] text-white text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
                >
                  <Wallet size={14} /> Ghi nhận khoản thu
                </button>
              ) : undefined
            }))}
          />
        </DataState>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <DataState loading={impLoading} error={impError} isEmpty={payables.length === 0} emptyTitle="Không có công nợ phải trả">
          {/* Desktop Table */}
          <div className="erp-table-container hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Danh sách công nợ phải trả cho nhà cung cấp</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">Ngày nhập</th>
                    <th scope="col" className="th-cell">Nhà cung cấp</th>
                    <th scope="col" className="th-cell text-right">Tổng tiền phiếu</th>
                    <th scope="col" className="th-cell text-right">Đã trả</th>
                    <th scope="col" className="th-cell">Trạng thái</th>
                    <th scope="col" className="th-cell text-right">Còn phải trả</th>
                    {canRecordPayment && <th scope="col" className="th-cell text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {payables.map(({ item, remaining }: { item: Import; remaining: number }) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách vãng lai'}</td>
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
                            onClick={() => openPaymentModal('import', item.id, item.contact_name || 'Khách vãng lai', remaining)}
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
                { label: 'Đã thanh toán', value: <span className="text-emerald-600 font-bold">{formatTien(paidByImport[item.id] || 0)}</span> },
                { label: 'Còn nợ phải trả', value: <span className="text-amber-600 font-black text-sm">{formatTien(remaining)}</span> },
              ],
              actions: canRecordPayment ? (
                <button
                  onClick={() => openPaymentModal('import', item.id, item.contact_name || 'Khách vãng lai', remaining)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
                >
                  <Wallet size={14} /> Ghi nhận khoản trả
                </button>
              ) : undefined
            }))}
          />
        </DataState>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        title={`Ghi nhận thanh toán — ${paymentTarget?.label || ''}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">Còn lại trước khi ghi:</span>
            <span className="font-mono font-black text-sm text-rose-600">{formatTien(paymentTarget?.remaining || 0)}</span>
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
    </div>
  );
};
