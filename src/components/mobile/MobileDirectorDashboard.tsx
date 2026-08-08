import * as React from 'react';
import {
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { formatTien, formatKg, formatNgay } from '../../lib/utils';
import type { Import, Export } from '../../types';

interface MobileDirectorDashboardProps {
  summary: {
    totalImportKg: number;
    totalExportKg: number;
    totalRevenue: number;
    estimatedProfit: number | null;
    receivables: number;
    payables: number;
    inventoryKg: number;
    inventoryBags: number;
    pendingImports: Import[];
    totalUnpaidReceivables: number;
    overdueReceivables: Export[];
    totalOverdueReceivables: number;
    lowStockAlert: boolean;
  };
}

export const MobileDirectorDashboard: React.FC<MobileDirectorDashboardProps> = ({ summary }) => {
  const hasAlerts =
    summary.pendingImports.length > 0 ||
    summary.totalUnpaidReceivables > 0 ||
    summary.overdueReceivables.length > 0 ||
    summary.lowStockAlert;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner - Giám Đốc */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-500)] text-white shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md">
            Giao diện Giám Đốc
          </span>
          <span className="text-[11px] font-mono opacity-80">{formatNgay(new Date().toISOString())}</span>
        </div>
        <h2 className="text-lg font-black tracking-tight">Tổng Quan Vận Hành Xưởng</h2>
        <p className="text-xs opacity-90 mt-0.5">Giám sát doanh thu, sản lượng & công nợ tức thời</p>
      </div>

      {/* Director Executive KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Doanh thu xuất
            </span>
          </div>
          <p className="text-base font-black font-mono text-[var(--text-primary)]">
            {formatTien(summary.totalRevenue)}
          </p>
        </div>

        {summary.estimatedProfit !== null && (
          <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
            <div className="flex items-center space-x-2 text-[var(--primary-500)] mb-1">
              <DollarSign size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Lợi nhuận gộp
              </span>
            </div>
            <p className="text-base font-black font-mono text-[var(--primary-500)]">
              {formatTien(summary.estimatedProfit)}
            </p>
          </div>
        )}

        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-blue-600 mb-1">
            <Package size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Tồn kho phế
            </span>
          </div>
          <p className="text-base font-black font-mono text-[var(--text-primary)]">
            {formatKg(summary.inventoryKg)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            ~{summary.inventoryBags} bao thành phẩm
          </p>
        </div>

        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <ArrowUpRight size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Nợ phải thu
            </span>
          </div>
          <p className="text-base font-black font-mono text-rose-600">{formatTien(summary.receivables)}</p>
        </div>
      </div>

      {/* Director Alert Center — dữ liệu thật, không hardcode */}
      <div className="card p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Cảnh Báo Giám Sát
        </h3>

        {!hasAlerts && (
          <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 flex items-start space-x-3">
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs font-black text-emerald-950 dark:text-emerald-100">Không có cảnh báo nào</p>
          </div>
        )}

        {summary.pendingImports.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 flex items-start space-x-3">
            <AlertTriangle size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-950 dark:text-amber-100">
                {summary.pendingImports.length} lô phế chưa xay
              </p>
              <p className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
                {summary.pendingImports
                  .slice(0, 2)
                  .map((i) => `${i.contact_name || 'Khách'} (${formatKg(i.quantity_kg || 0)})`)
                  .join(' & ')}
                {summary.pendingImports.length > 2 && ' ...'}
              </p>
            </div>
          </div>
        )}

        {summary.totalUnpaidReceivables > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-500 flex items-start space-x-3">
            <ArrowUpRight size={18} className="text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-950 dark:text-rose-100">
                Công nợ phải thu: {formatTien(summary.totalUnpaidReceivables)}
              </p>
              <p className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">
                Xem chi tiết tại trang Tài chính &gt; Công nợ.
              </p>
            </div>
          </div>
        )}

        {summary.overdueReceivables.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-200 dark:bg-rose-900/90 border-2 border-rose-600 flex items-start space-x-3">
            <Clock size={18} className="text-rose-800 dark:text-rose-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-950 dark:text-rose-100">
                {summary.overdueReceivables.length} khách nợ quá hạn
              </p>
              <p className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">
                {formatTien(summary.totalOverdueReceivables)} — nên nhắc thu sớm
              </p>
            </div>
          </div>
        )}

        {summary.lowStockAlert && (
          <div className="p-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 flex items-start space-x-3">
            <TrendingDown size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-950 dark:text-amber-100">Tồn kho xuống thấp</p>
              <p className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
                Chỉ còn {formatKg(summary.inventoryKg)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
