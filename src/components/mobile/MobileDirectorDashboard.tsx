import * as React from 'react';
import { useState } from 'react';
import { 
  TrendingUp, Package, DollarSign, AlertTriangle, 
  Search, Eye, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2
} from 'lucide-react';
import { cn, formatTien, formatKg, formatNgay } from '../../lib/utils';
import { KpiCard } from '../KpiCard';
import { Modal } from '../Modal';

interface MobileDirectorDashboardProps {
  summary: {
    totalImportKg: number;
    totalExportKg: number;
    totalRevenue: number;
    estimatedProfit: number;
    receivables: number;
    payables: number;
    inventoryKg: number;
    inventoryBags: number;
  };
}

export const MobileDirectorDashboard: React.FC<MobileDirectorDashboardProps> = ({ summary }) => {
  const [selectedReceipt, setSelectedReceipt] = useState<{ title: string; image: string; info: string } | null>(null);

  const receipts = [
    {
      title: 'Phiếu cân xe #1 - Em Hoàn (1.796 kg)',
      info: 'Tổng: 4.531 kg | Bì: 2.735 kg | Hàng: 1.796 kg • HTX Eco Wood Hồng Lĩnh',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60'
    },
    {
      title: 'Phiếu cân xe #2 - Đà Nẵng (7.445 kg)',
      info: 'Tổng: 27.785 kg | Bì: 20.340 kg | Hàng: 7.445 kg • HTX Eco Wood Hồng Lĩnh',
      image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=60'
    }
  ];

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
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Doanh thu xuất</span>
          </div>
          <p className="text-base font-black font-mono text-[var(--text-primary)]">{formatTien(summary.totalRevenue)}</p>
        </div>

        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-[var(--primary-500)] mb-1">
            <DollarSign size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Lợi nhuận gộp</span>
          </div>
          <p className="text-base font-black font-mono text-[var(--primary-500)]">{formatTien(summary.estimatedProfit)}</p>
        </div>

        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-blue-600 mb-1">
            <Package size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tồn kho phế</span>
          </div>
          <p className="text-base font-black font-mono text-[var(--text-primary)]">{formatKg(summary.inventoryKg)}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">~{summary.inventoryBags} bao thành phẩm</p>
        </div>

        <div className="card p-3.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs">
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <ArrowUpRight size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Nợ phải thu</span>
          </div>
          <p className="text-base font-black font-mono text-rose-600">{formatTien(summary.receivables)}</p>
        </div>
      </div>

      {/* Director Alert Center */}
      <div className="card p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Cảnh Báo Giám Sát Tự Động
        </h3>

        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start space-x-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">2 Lô phế mới nhập chưa xay</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Lô Em Hoàn (1.796kg) & Đà Nẵng (7.445kg) ngày 28/07 đang chờ máy xay.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-start space-x-3">
          <ArrowUpRight size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Công nợ phải thu: 97.200.000 đ</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">Nhà máy Nhựa Việt chưa thanh toán đơn xuất 18 bao phế.</p>
          </div>
        </div>
      </div>

      {/* Quick Receipt Lookups */}
      <div className="card p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} className="text-[var(--primary-500)]" />
          Tra Cứu Nhanh Phiếu Cân Xe 28/07
        </h3>

        <div className="space-y-2">
          {receipts.map((r, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedReceipt(r)}
              className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center cursor-pointer hover:bg-[var(--primary-50)]/50 transition-all"
            >
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{r.title}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{r.info}</p>
              </div>
              <button className="p-1.5 rounded-lg text-[var(--primary-500)] bg-[var(--bg-surface)] shadow-xs">
                <Eye size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal View Receipt */}
      <Modal isOpen={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title={selectedReceipt?.title || 'Phiếu cân xe'}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">{selectedReceipt?.info}</p>
          <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-slate-900 flex justify-center p-2">
            <img src={selectedReceipt?.image} alt="Phiếu cân xe" className="max-h-64 object-contain rounded-lg" />
          </div>
          <div className="flex justify-end">
            <button onClick={() => setSelectedReceipt(null)} className="btn-secondary">
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
