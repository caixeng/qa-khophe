import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Cog, Truck, Warehouse, Activity, Bell, ArrowRight, DollarSign } from 'lucide-react';
import { formatKg, formatNgay, formatTien } from '../lib/utils';
import { KpiCard } from '../components/KpiCard';
import { MobileDirectorDashboard } from '../components/mobile/MobileDirectorDashboard';
import { MonthlyOverviewChart } from '../components/MonthlyOverviewChart';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuth } from '../contexts/auth';
import { reviewService } from '../services/reviewService';
import { Link } from 'react-router-dom';
import { DataState } from '../components/DataState';
import { useDesktop } from '../hooks/useDesktop';
import { today } from '../lib/date';

/** Quá 30 ngày chưa thu là mức cảnh báo hợp lý cho xưởng phế — đủ dài để không
 *  làm phiền với công nợ mới phát sinh, đủ ngắn để còn kịp nhắc khách trước
 *  khi khoản nợ "nguội" và khó đòi hơn. */
const OVERDUE_DEBT_DAYS = 30;

export const DashboardPage: React.FC = () => {
  const isDesktop = useDesktop();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'accountant';

  const {
    data: snapshot,
    loading,
    error,
    refetch,
  } = useAsyncData(reviewService.getDashboard, [canSeeFinance]);
  const retry = () => void refetch();
  const summary = snapshot?.summary;
  if (!summary && !loading && !error) return null;

  if (loading || error)
    return <DataState loading={loading} error={error} onRetry={retry} skeletonType="kpi" />;

  if (!summary || !snapshot) return null;
  return (
    <div className="page-shell animate-fade-in">
      <Link to="/doi-soat" className="card p-3 flex justify-between gap-3 text-xs font-bold">
        Đối soát kho, hao hụt và tiền ứng <span>Kiểm tra →</span>
      </Link>
      {/* MOBILE SPECIFIC VIEW */}
      {!isDesktop && (
        <div className="block lg:hidden">
          <MobileDirectorDashboard
            summary={summary}
            monthlyStats={snapshot.monthly}
            canSeeFinance={canSeeFinance}
          />
        </div>
      )}

      {/* DESKTOP DASHBOARD VIEW */}
      {isDesktop && (
        <div className="hidden lg:block space-y-6">
          <div className="workshop-hero">
            <div>
              <div className="eyebrow">Vua Phế · Tổng quan vận hành</div>
              <h1>Chào {user?.name || 'bạn'}, một ngày làm việc hiệu quả.</h1>
              <p>Theo dõi dòng hàng, sản lượng và hoạt động xưởng trong một nơi.</p>
            </div>
            <span className="hero-date">{formatNgay(today())}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <KpiCard
              title="Nhập hôm nay"
              value={formatKg(summary.todayImportKg)}
              icon={Package}
              color="success"
            />
            <KpiCard title="Xay hôm nay" value={formatKg(summary.todayGroundKg)} icon={Cog} color="warning" />
            <KpiCard
              title="Xuất hôm nay"
              value={`${summary.todayExportBags} bao`}
              icon={Truck}
              color="info"
            />
            <KpiCard
              title="Tồn kho hiện tại"
              value={`${summary.inventoryBags} bao`}
              subtitle={`~${formatKg(summary.inventoryKg)}`}
              icon={Warehouse}
              color="primary"
            />
          </div>

          {/* Quick actions desktop */}
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/phe?tab=nhap&open=true')}
              className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Package size={18} /> 📥 Nhập phế
              </span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/phe?tab=xay&open=true')}
              className="p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Cog size={18} /> ⚙️ Xay phế
              </span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/phe?tab=xuat&open=true')}
              className="p-4 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Truck size={18} /> 📤 Xuất phế
              </span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/tai-chinh?tab=chiphi&open=true')}
              className="p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center justify-between font-bold text-sm transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <DollarSign size={18} /> 💰 Ghi chi phí
              </span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Biểu đồ tổng hợp các nội dung theo tháng */}
          <MonthlyOverviewChart monthlyStats={snapshot.monthly} canSeeFinance={canSeeFinance} />

          {/* Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity size={18} className="text-[var(--primary-500)]" /> Hoạt động gần đây
                </h3>
                <button
                  onClick={() => navigate('/phe')}
                  className="text-xs font-bold text-[var(--primary-500)] hover:underline flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {summary.recentActivities.length > 0 ? (
                  summary.recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{act.text}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{formatNgay(act.date)}</p>
                      </div>
                      <span className="font-mono font-bold text-xs text-[var(--primary-500)]">
                        {act.unit === 'kg' ? formatKg(act.amount) : `${formatTien(act.amount)}đ`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                    Chưa có hoạt động nào
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Bell size={18} className="text-amber-500" /> Cảnh báo & Nhắc nhở
              </h3>
              <div className="space-y-3">
                {summary.pendingImportCount > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-amber-400 shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      ⚠️ {summary.pendingImportCount} Lô phế chưa xay
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {summary.pendingImports
                        .slice(0, 2)
                        .map((i) => `${i.contact_name || 'Khách'} (${formatKg(i.quantity_kg || 0)})`)
                        .join(' & ')}
                      {summary.pendingImportCount > 2 && ' ...'}
                    </p>
                  </div>
                )}
                {summary.unpaidExports.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-rose-400 shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-primary)]">🔴 Công nợ phải thu</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {summary.totalUnpaidReceivables.toLocaleString('vi-VN')} đ cần thu hồi
                    </p>
                  </div>
                )}
                {summary.overdueCount > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-rose-500 shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      ⏰ {summary.overdueCount} phiếu nợ quá {OVERDUE_DEBT_DAYS} ngày
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {summary.totalOverdueReceivables.toLocaleString('vi-VN')} đ — nên nhắc thu trước khi khó
                      đòi hơn
                    </p>
                  </div>
                )}
                {summary.lowStockAlert && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border-2 border-amber-500 shadow-sm">
                    <p className="text-xs font-bold text-[var(--text-primary)]">📉 Tồn kho xuống thấp</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Chỉ còn {formatKg(summary.inventoryKg)} — dưới ngưỡng đã cấu hình
                    </p>
                  </div>
                )}
                {summary.pendingImportCount === 0 &&
                  summary.unpaidExports.length === 0 &&
                  summary.overdueCount === 0 &&
                  !summary.lowStockAlert && (
                    <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                      Không có cảnh báo nào
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
