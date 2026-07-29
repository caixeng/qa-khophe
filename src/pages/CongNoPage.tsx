import * as React from 'react';
import { useState, useMemo } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn, formatTien, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { StatusBadge } from '../components/StatusBadge';
import { useAsyncData } from '../hooks/useAsyncData';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';

export const CongNoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');

  const { data: importsData, loading: impLoading, error: impError } = useAsyncData(importsService.getAll, []);
  const { data: exportsData, loading: expLoading, error: expError } = useAsyncData(exportsService.getAll, []);

  const imports = importsData || [];
  const exports = exportsData || [];

  // Payables: Imports with unpaid or partial payment
  const payables = useMemo(() => {
    return imports.filter((i) => i.payment_status === 'unpaid' || i.payment_status === 'partial');
  }, [imports]);

  // Receivables: Exports with unpaid or partial payment
  const receivables = useMemo(() => {
    return exports.filter((e) => e.payment_status === 'unpaid' || e.payment_status === 'partial');
  }, [exports]);

  const totalReceivableAmount = useMemo(() => {
    return receivables.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  }, [receivables]);

  const totalPayableAmount = useMemo(() => {
    return payables.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  }, [payables]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader
        title="Công Nợ Đối Tác"
        subtitle="Quản lý các khoản nợ phải thu (Khách mua) và nợ phải trả (Nhà cung cấp)"
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
          <div className="erp-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="th-cell">Ngày phát sinh</th>
                    <th className="th-cell">Khách hàng</th>
                    <th className="th-cell text-right">Số lượng xuất</th>
                    <th className="th-cell text-right">Tổng giá trị đơn</th>
                    <th className="th-cell">Trạng thái thanh toán</th>
                    <th className="th-cell text-right">Nợ còn lại</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((item) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách mua'}</td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {(item as any).total_quantity_kg || (item as any).total_kg || 0} kg
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell text-right font-mono font-black text-xs text-rose-600">
                        {formatTien(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataState>
      )}

      {/* Payables Tab */}
      {activeTab === 'payables' && (
        <DataState loading={impLoading} error={impError} isEmpty={payables.length === 0} emptyTitle="Không có công nợ phải trả">
          <div className="erp-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="th-cell">Ngày nhập</th>
                    <th className="th-cell">Nhà cung cấp</th>
                    <th className="th-cell text-right">Khối lượng phế</th>
                    <th className="th-cell text-right">Tổng tiền phiếu</th>
                    <th className="th-cell">Trạng thái thanh toán</th>
                    <th className="th-cell text-right">Nợ phải trả</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((item) => (
                    <tr key={item.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(item.date)}</td>
                      <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{item.contact_name || 'Khách vãng lai'}</td>
                      <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                        {item.quantity_kg} kg
                      </td>
                      <td className="td-cell text-right font-mono font-bold text-xs text-[var(--text-primary)]">
                        {formatTien(item.total_amount)}
                      </td>
                      <td className="td-cell">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="td-cell text-right font-mono font-black text-xs text-amber-600">
                        {formatTien(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataState>
      )}
    </div>
  );
};
