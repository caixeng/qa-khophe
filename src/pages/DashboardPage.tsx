import * as React from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Cog, Truck, Warehouse, Activity, Bell, ArrowRight, DollarSign
} from 'lucide-react';
import { formatKg, formatNgay } from '../lib/utils';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { MobileDirectorDashboard } from '../components/mobile/MobileDirectorDashboard';
import { useAsyncData } from '../hooks/useAsyncData';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { expensesService } from '../services/expensesService';
import { grindingService } from '../services/grindingService';
import { settingsService } from '../services/settingsService';
import { computeInventory } from '../lib/calc';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'manager' || user?.role === 'admin';

  const { data: importsData } = useAsyncData(importsService.getAll, []);
  const { data: exportsData } = useAsyncData(exportsService.getAll, []);
  // Staff không có quyền đọc expenses (RLS) — tránh gọi API sẽ chỉ nhận lỗi 403
  const { data: expensesData } = useAsyncData(
    canSeeFinance ? expensesService.getExpenses : async () => [],
    [canSeeFinance]
  );
  const { data: grindingData } = useAsyncData(grindingService.getAll, []);
  const { data: kgPerBagData } = useAsyncData(settingsService.getKgPerBag, []);

  const imports = importsData || [];
  const exports = exportsData || [];
  const expenses = expensesData || [];
  const grinding = grindingData || [];
  const kgPerBag = kgPerBagData ?? 900;

  const summary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayImportKg = imports.filter(i => i.date === todayStr).reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const todayGroundKg = grinding.filter(g => g.date === todayStr).reduce((sum, g) => sum + (Number(g.output_qty_kg) || 0), 0);
    const todayExportBags = exports.filter(e => e.date === todayStr).reduce((sum, e) => sum + (Number(e.bags_count) || 0), 0);

    const totalImportKg = imports.reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const totalImportCost = imports.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalExportKg = exports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const totalRevenue = exports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    const totalOperatingCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Chưa có quyền đọc chi phí (staff) thì không suy đoán lợi nhuận — ẩn thay vì hiện số sai
    const estimatedProfit = canSeeFinance ? totalRevenue - totalImportCost - totalOperatingCost : null;
    const receivables = exports.filter(e => e.payment_status === 'unpaid').reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
    const payables = imports.filter(i => i.payment_status === 'unpaid').reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalGround = grinding.reduce((sum, g) => sum + (Number(g.output_qty_kg) || 0), 0);
    const { currentStockKg: inventoryKg, currentBags: inventoryBags } = computeInventory(totalGround, totalExportKg, kgPerBag);

    // Dynamic recent activities
    const activities = [
      ...imports.map(i => ({
        id: `import-${i.id}`,
        type: 'import',
        text: `Nhập ${formatKg(i.quantity_kg || 0)} từ ${i.contact_name || 'Khách lẻ'}`,
        time: i.created_at ? formatNgay(i.created_at) : '',
        amount: `+${formatKg(i.quantity_kg || 0)}`,
        date: i.created_at ? new Date(i.created_at) : new Date(0)
      })),
      ...exports.map(e => ({
        id: `export-${e.id}`,
        type: 'export',
        text: `Xuất ${e.total_kg || 0} kg cho ${e.contact_name || 'Khách lẻ'}`,
        time: e.created_at ? formatNgay(e.created_at) : '',
        amount: `-${formatKg(e.total_kg || 0)}`,
        date: e.created_at ? new Date(e.created_at) : new Date(0)
      })),
      ...expenses.map(ex => ({
        id: `expense-${ex.id}`,
        type: 'expense',
        text: ex.description || ex.category || 'Chi phí',
        time: ex.date ? formatNgay(ex.date) : '',
        amount: `-${(Number(ex.amount) || 0).toLocaleString('vi-VN')}đ`,
        date: ex.date ? new Date(ex.date) : new Date(0)
      }))
    ];

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivities = activities.slice(0, 5);

    // Alerts
    const pendingImports = imports.filter(i => i.processing_status === 'pending');
    const unpaidExports = exports.filter(e => e.payment_status === 'unpaid');
    const totalUnpaidReceivables = unpaidExports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    return {
      todayImportKg,
      todayGroundKg,
      todayExportBags,
      totalImportKg,
      totalImportCost,
      totalExportKg,
      totalRevenue,
      totalOperatingCost,
      estimatedProfit,
      receivables,
      payables,
      inventoryKg,
      inventoryBags,
      recentActivities,
      pendingImports,
      unpaidExports,
      totalUnpaidReceivables
    };
  }, [imports, exports, expenses, grinding, kgPerBag, canSeeFinance]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* MOBILE SPECIFIC VIEW */}
      <div className="block lg:hidden">
        <MobileDirectorDashboard summary={summary} />
      </div>

      {/* DESKTOP DASHBOARD VIEW */}
      <div className="hidden lg:block space-y-6">
        <PageHeader title="Tổng quan" subtitle={`Hoạt động xưởng ngày hôm nay ${formatNgay(new Date().toISOString())}`} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Nhập hôm nay" value={formatKg(summary.todayImportKg)} icon={Package} color="success" />
          <KpiCard title="Xay hôm nay" value={formatKg(summary.todayGroundKg)} icon={Cog} color="warning" />
          <KpiCard title="Xuất hôm nay" value={`${summary.todayExportBags} bao`} icon={Truck} color="info" />
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
                <Activity size={18} className="text-[var(--primary-500)]" /> Hoạt động gần đây
              </h3>
              <button onClick={() => navigate('/phe')} className="text-xs font-bold text-[var(--primary-500)] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {summary.recentActivities.length > 0 ? summary.recentActivities.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{act.text}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.time}</p>
                  </div>
                  <span className="font-mono font-bold text-xs text-[var(--primary-500)]">{act.amount}</span>
                </div>
              )) : (
                <div className="p-3 text-center text-xs text-[var(--text-muted)]">Chưa có hoạt động nào</div>
              )}
            </div>
          </div>

          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Bell size={18} className="text-amber-500" /> Cảnh báo & Nhắc nhở
            </h3>
            <div className="space-y-3">
              {summary.pendingImports.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-amber-400 shadow-sm">
                  <p className="text-xs font-bold text-[var(--text-primary)]">⚠️ {summary.pendingImports.length} Lô phế chưa xay</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {summary.pendingImports.slice(0, 2).map(i => `${i.contact_name || 'Khách'} (${formatKg(i.quantity_kg || 0)})`).join(' & ')}
                    {summary.pendingImports.length > 2 && ' ...'}
                  </p>
                </div>
              )}
              {summary.unpaidExports.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-rose-400 shadow-sm">
                  <p className="text-xs font-bold text-[var(--text-primary)]">🔴 Công nợ phải thu</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{summary.totalUnpaidReceivables.toLocaleString('vi-VN')} đ cần thu hồi</p>
                </div>
              )}
              {summary.pendingImports.length === 0 && summary.unpaidExports.length === 0 && (
                <div className="p-3 text-center text-xs text-[var(--text-muted)]">Không có cảnh báo nào</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
