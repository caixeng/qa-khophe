import * as React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Cog, Truck, Warehouse, Activity, Bell, Clock, ArrowRight,
  ShieldCheck, Eye, Edit3, DollarSign, AlertTriangle, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn, formatTien, formatKg } from '../lib/utils';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { MobileDirectorDashboard } from '../components/mobile/MobileDirectorDashboard';
import { MobileManagerInput } from '../components/mobile/MobileManagerInput';
import { useAsyncData } from '../hooks/useAsyncData';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { expensesService } from '../services/expensesService';
import { grindingService } from '../services/grindingService';

const recentActivities = [
  { id: 1, type: 'import', text: 'Nhập 1.796 kg từ Em Hoàn', time: 'Phiếu cân xe Eco Wood', amount: '+1.796 kg' },
  { id: 2, type: 'import', text: 'Nhập 7.445 kg từ Đà Nẵng', time: 'Phiếu cân xe Eco Wood', amount: '+7.445 kg' },
  { id: 3, type: 'grind', text: 'Xay 18 bao (tích lũy 26 bao)', time: 'Thợ Hoa', amount: '18 bao' },
  { id: 4, type: 'export', text: 'Xuất 18 bao cho Cty Nhựa Việt', time: '28/07/2026', amount: '-16.200 kg' },
  { id: 5, type: 'expense', text: 'Chi thắp hương', time: '28/07/2026', amount: '-85.000đ' },
];

const chartData = [
  { name: '28/07', 'Nhập (kg)': 9241, 'Xuất (kg)': 16200 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [roleMode, setRoleMode] = useState<'director' | 'manager'>('director');

  const { data: importsData } = useAsyncData(importsService.getAll, []);
  const { data: exportsData } = useAsyncData(exportsService.getAll, []);
  const { data: expensesData } = useAsyncData(expensesService.getExpenses, []);
  const { data: grindingData } = useAsyncData(grindingService.getAll, []);

  const imports = importsData || [];
  const exports = exportsData || [];
  const expenses = expensesData || [];
  const grinding = grindingData || [];

  const summary = useMemo(() => {
    const totalImportKg = imports.reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const totalImportCost = imports.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalExportKg = exports.reduce((sum, e) => sum + (Number(e.total_quantity_kg) || 0), 0);
    const totalRevenue = exports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    const totalOperatingCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const estimatedProfit = totalRevenue - totalImportCost - totalOperatingCost;
    const receivables = exports.filter(e => e.payment_status === 'unpaid').reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
    const payables = imports.filter(i => i.payment_status === 'unpaid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalGround = grinding.reduce((sum, g) => sum + (Number(g.output_quantity_kg) || 0), 0);
    const inventoryKg = Math.max(0, totalGround - totalExportKg);
    const inventoryBags = Math.round(inventoryKg / 900);

    return {
      totalImportKg,
      totalImportCost,
      totalExportKg,
      totalRevenue,
      totalOperatingCost,
      estimatedProfit,
      receivables,
      payables,
      inventoryKg: inventoryKg || 52200,
      inventoryBags: inventoryBags || 58
    };
  }, [imports, exports, expenses, grinding]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* Role Switcher Bar for Mobile & Desktop */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={18} className="text-[var(--primary-500)]" />
          <span className="text-xs font-bold text-[var(--text-primary)]">Chế độ xem di động:</span>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            onClick={() => setRoleMode('director')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              roleMode === 'director'
                ? "bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Eye size={14} />
            <span>Giám Đốc</span>
          </button>

          <button
            onClick={() => setRoleMode('manager')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              roleMode === 'manager'
                ? "bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Edit3 size={14} />
            <span>Quản Lý Xưởng</span>
          </button>
        </div>
      </div>

      {/* MOBILE SPECIFIC VIEW */}
      <div className="block lg:hidden">
        {roleMode === 'director' ? (
          <MobileDirectorDashboard summary={summary} />
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                Giao diện Quản Lý Xưởng
              </span>
              <h2 className="text-lg font-black tracking-tight mt-1">Nhập Liệu Nhanh Tại Xưởng</h2>
              <p className="text-xs opacity-90 mt-0.5">Sử dụng nút bấm nổi (+) ở góc phải để thêm phiếu nhanh</p>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/phe?tab=nhap')}
                className="p-4 rounded-2xl bg-emerald-500 text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Package size={28} className="mb-2" />
                <span className="text-xs font-black">+ Nhập Phế</span>
                <span className="text-[10px] opacity-80 mt-0.5">Nhập lô phế mới</span>
              </button>

              <button
                onClick={() => navigate('/phe?tab=xay')}
                className="p-4 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Cog size={28} className="mb-2" />
                <span className="text-xs font-black">+ Ghi Phiếu Xay</span>
                <span className="text-[10px] opacity-80 mt-0.5">Tính % hao hụt</span>
              </button>

              <button
                onClick={() => navigate('/phe?tab=xuat')}
                className="p-4 rounded-2xl bg-blue-500 text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Truck size={28} className="mb-2" />
                <span className="text-xs font-black">+ Xuất Bán</span>
                <span className="text-[10px] opacity-80 mt-0.5">Xuất phế thành phẩm</span>
              </button>

              <button
                onClick={() => navigate('/tai-chinh?tab=chiphi')}
                className="p-4 rounded-2xl bg-rose-500 text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <DollarSign size={28} className="mb-2" />
                <span className="text-xs font-black">+ Chi Phí</span>
                <span className="text-[10px] opacity-80 mt-0.5">Ghi xăng xe, phụ tùng</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP DASHBOARD VIEW */}
      <div className="hidden lg:block space-y-6">
        <PageHeader title="Tổng quan" subtitle="Hoạt động xưởng ngày hôm nay 28/07/2026" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Nhập hôm nay" value={formatKg(summary.totalImportKg)} icon={Package} color="success" trend={12} />
          <KpiCard title="Xay hôm nay" value={formatKg(16200)} icon={Cog} color="warning" trend={5} />
          <KpiCard title="Xuất hôm nay" value="18 bao" icon={Truck} color="info" trend={-3} />
          <KpiCard title="Tồn kho hiện tại" value={`${summary.inventoryBags} bao`} subtitle={`~${formatKg(summary.inventoryKg)}`} icon={Warehouse} color="primary" />
        </div>

        {/* Quick actions desktop */}
        <div className="grid grid-cols-4 gap-4">
          <button onClick={() => navigate('/phe?tab=nhap')} className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer">
            <span className="flex items-center gap-2"><Package size={18} /> 📥 Nhập phế</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/phe?tab=xay')} className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer">
            <span className="flex items-center gap-2"><Cog size={18} /> ⚙️ Xay phế</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/phe?tab=xuat')} className="p-4 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer">
            <span className="flex items-center gap-2"><Truck size={18} /> 📤 Xuất phế</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate('/tai-chinh?tab=chiphi')} className="p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer">
            <span className="flex items-center gap-2"><DollarSign size={18} /> 💰 Ghi chi phí</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Activity size={18} className="text-[var(--primary-500)]" /> Hoạt động gần đây (28/07)
              </h3>
              <button onClick={() => navigate('/phe')} className="text-xs font-bold text-[var(--primary-500)] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{act.text}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.time}</p>
                  </div>
                  <span className="font-mono font-bold text-xs text-[var(--primary-500)]">{act.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Bell size={18} className="text-amber-500" /> Cảnh báo & Nhắc nhở
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">2 Lô phế chưa xay</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Lô Em Hoàn (1.796kg) & Đà Nẵng (7.445kg)</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Công nợ phải thu cao</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">97.200.000 đ cần thu hồi từ Nhà máy Nhựa Việt</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile Manager */}
      <MobileManagerInput />
    </div>
  );
};
