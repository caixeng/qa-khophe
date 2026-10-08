import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { BarChart3, Package, Truck, Cog, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn, formatKg, formatTien } from '../lib/utils';
import {
  getRecentMonths,
  formatCompactWeight,
  formatCompactMoney,
  aggregateMonthlyStats,
  computeGrowth,
  type MonthlyStatItem,
} from '../lib/monthlyStats';
import type { Import, Export, Grinding, Expense, Attendance } from '../types';

export interface MonthlyOverviewChartProps {
  imports: Import[];
  exports: Export[];
  grinding: Grinding[];
  expenses?: Expense[];
  attendance?: Attendance[];
  canSeeFinance?: boolean;
  className?: string;
}

type MetricMode = 'volume' | 'finance';
type TimeHorizon = '6m' | '12m' | 'year';

export const MonthlyOverviewChart: React.FC<MonthlyOverviewChartProps> = ({
  imports,
  exports,
  grinding,
  expenses = [],
  attendance = [],
  canSeeFinance = false,
  className,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('volume');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('6m');

  // Xác định danh sách các tháng dựa trên timeHorizon
  const targetMonths = useMemo(() => {
    const now = new Date();
    if (timeHorizon === '12m') {
      return getRecentMonths(12, now);
    }
    if (timeHorizon === 'year') {
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth(); // 0-based
      const monthsInYear: string[] = [];
      for (let m = 1; m <= currentMonthIndex + 1; m++) {
        monthsInYear.push(`${currentYear}-${String(m).padStart(2, '0')}`);
      }
      return monthsInYear;
    }
    // Mặc định: 6 tháng gần nhất (rất vừa vặn trên màn hình mobile)
    return getRecentMonths(6, now);
  }, [timeHorizon]);

  // Tổng hợp dữ liệu các tháng
  const monthlyData = useMemo(() => {
    return aggregateMonthlyStats({
      months: targetMonths,
      imports,
      exports,
      grinding,
      expenses,
      attendance,
    });
  }, [targetMonths, imports, exports, grinding, expenses, attendance]);

  // Tháng mới nhất và tháng liền trước để tính tăng trưởng
  const latestMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : undefined;

  const importGrowth = useMemo(
    () => computeGrowth(latestMonth?.importKg || 0, previousMonth?.importKg || 0),
    [latestMonth, previousMonth],
  );

  const exportGrowth = useMemo(
    () => computeGrowth(latestMonth?.exportKg || 0, previousMonth?.exportKg || 0),
    [latestMonth, previousMonth],
  );

  const revenueGrowth = useMemo(
    () => computeGrowth(latestMonth?.revenue || 0, previousMonth?.revenue || 0),
    [latestMonth, previousMonth],
  );

  const profitGrowth = useMemo(
    () => computeGrowth(latestMonth?.profit || 0, previousMonth?.profit || 0),
    [latestMonth, previousMonth],
  );

  // Kiểm tra có dữ liệu không
  const hasData = useMemo(() => {
    return monthlyData.some(
      (m) => m.importKg > 0 || m.groundKg > 0 || m.exportKg > 0 || m.revenue > 0 || m.operatingCost > 0,
    );
  }, [monthlyData]);

  // Custom tooltip hiển thị đẹp, rõ ràng cả trên Desktop và Mobile
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentItem: MonthlyStatItem | undefined = payload[0]?.payload;

    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] p-3 rounded-xl shadow-lg text-xs space-y-2 min-w-[190px] sm:min-w-[220px]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Calendar size={13} className="text-[var(--primary-500)]" />
            {currentItem?.month
              ? `Tháng ${currentItem.month.split('-')[1]}/${currentItem.month.split('-')[0]}`
              : label}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            {metricMode === 'volume' ? 'Sản lượng' : 'Tài chính'}
          </span>
        </div>

        {metricMode === 'volume' ? (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
                Nhập phế:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatKg(currentItem?.importKg || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 inline-block" />
                Xay phế:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatKg(currentItem?.groundKg || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 inline-block" />
                Xuất phế:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatKg(currentItem?.exportKg || 0)}{' '}
                {currentItem?.exportBags ? `(${currentItem.exportBags} bao)` : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 inline-block" />
                Doanh thu:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatTien(currentItem?.revenue || 0)} đ
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 inline-block" />
                Mua phế:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatTien(currentItem?.importCost || 0)} đ
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400 inline-block" />
                Chi phí xưởng:
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {formatTien(currentItem?.operatingCost || 0)} đ
              </span>
            </div>
            <div className="border-t border-[var(--border-color)] pt-1 mt-1 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full inline-block',
                    (currentItem?.profit || 0) >= 0 ? 'bg-emerald-600' : 'bg-rose-600',
                  )}
                />
                Chênh lệch bán − mua − chi:
              </span>
              <span
                className={cn(
                  'font-mono font-bold',
                  (currentItem?.profit || 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600',
                )}
              >
                {formatTien(currentItem?.profit || 0)} đ
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'card p-4 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4 transition-all',
        className,
      )}
    >
      {/* HEADER: Title & Interactive Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-300)]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Tổng hợp hoạt động theo tháng
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
              {metricMode === 'volume'
                ? 'So sánh khối lượng nhập, xay & xuất phế qua các tháng'
                : 'Diễn biến doanh thu xuất, chi phí và chênh lệch bán − mua − chi phí'}
            </p>
          </div>
        </div>

        {/* Controls: Mode Switcher & Time Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs: Sản lượng vs Tài chính (nếu có quyền) */}
          {canSeeFinance && (
            <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMetricMode('volume')}
                className={cn(
                  'tap-target px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer',
                  metricMode === 'volume'
                    ? 'bg-[var(--primary-500)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                Sản lượng
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('finance')}
                className={cn(
                  'tap-target px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer',
                  metricMode === 'finance'
                    ? 'bg-[var(--primary-500)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                Tài chính
              </button>
            </div>
          )}

          {/* Time Horizon Pills */}
          <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs">
            <button
              type="button"
              onClick={() => setTimeHorizon('6m')}
              className={cn(
                'tap-target px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer',
                timeHorizon === '6m'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              6 tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeHorizon('12m')}
              className={cn(
                'tap-target px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer',
                timeHorizon === '12m'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              12 tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeHorizon('year')}
              className={cn(
                'tap-target px-2.5 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer',
                timeHorizon === 'year'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              Năm {new Date().getFullYear()}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE-FIRST HIGHLIGHT CARDS: Tóm tắt tháng gần nhất */}
      {latestMonth && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1">
          {metricMode === 'volume' ? (
            <>
              {/* Nhập phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Package size={12} /> Nhập {latestMonth.shortLabel}
                  </span>
                  {importGrowth.pct !== null && (
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold flex items-center',
                        importGrowth.pct >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {importGrowth.pct >= 0 ? '+' : ''}
                      {importGrowth.pct}%
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-emerald-900 dark:text-emerald-200 truncate">
                  {formatKg(latestMonth.importKg)}
                </p>
              </div>

              {/* Xay phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Cog size={12} /> Xay {latestMonth.shortLabel}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-amber-900 dark:text-amber-200 truncate">
                  {formatKg(latestMonth.groundKg)}
                </p>
              </div>

              {/* Xuất phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Truck size={12} /> Xuất {latestMonth.shortLabel}
                  </span>
                  {exportGrowth.pct !== null && (
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold flex items-center',
                        exportGrowth.pct >= 0 ? 'text-blue-600' : 'text-rose-600',
                      )}
                    >
                      {exportGrowth.pct >= 0 ? '+' : ''}
                      {exportGrowth.pct}%
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-blue-900 dark:text-blue-200 truncate">
                  {formatKg(latestMonth.exportKg)}
                </p>
              </div>

              {/* Số bao xuất */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    Số bao xuất
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-[var(--text-primary)] truncate">
                  {latestMonth.exportBags} bao
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Doanh thu */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50">
                <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <DollarSign size={12} /> Doanh thu
                  </span>
                  {revenueGrowth.pct !== null && (
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold',
                        revenueGrowth.pct >= 0 ? 'text-teal-600' : 'text-rose-600',
                      )}
                    >
                      {revenueGrowth.pct >= 0 ? '+' : ''}
                      {revenueGrowth.pct}%
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-teal-900 dark:text-teal-200 truncate">
                  {formatTien(latestMonth.revenue)} đ
                </p>
              </div>

              {/* Tiền mua phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Mua phế</span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-amber-900 dark:text-amber-200 truncate">
                  {formatTien(latestMonth.importCost)} đ
                </p>
              </div>

              {/* Chi phí vận hành */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    Chi phí xưởng
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-rose-900 dark:text-rose-200 truncate">
                  {formatTien(latestMonth.operatingCost)} đ
                </p>
              </div>

              {/* Chênh lệch bán − mua − chi */}
              <div
                className={cn(
                  'p-2.5 sm:p-3 rounded-xl border',
                  latestMonth.profit >= 0
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50',
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1',
                      latestMonth.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700',
                    )}
                  >
                    {latestMonth.profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    Chênh lệch bán − mua − chi
                  </span>
                  {profitGrowth.pct !== null && (
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold',
                        profitGrowth.pct >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {profitGrowth.pct >= 0 ? '+' : ''}
                      {profitGrowth.pct}%
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-sm sm:text-base font-black font-mono truncate',
                    latestMonth.profit >= 0
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-rose-900 dark:text-rose-200',
                  )}
                >
                  {formatTien(latestMonth.profit)} đ
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* CHART CONTAINER: Responsive & Mobile Optimized */}
      <div className="w-full pt-1">
        {!hasData ? (
          <div className="h-56 sm:h-72 w-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-subtle)]">
            <BarChart3 size={32} className="text-[var(--text-muted)] opacity-50 mb-2" />
            <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm">
              Khi phát sinh phiếu nhập, xay hoặc xuất phế, biểu đồ sẽ tự động tổng hợp xu hướng theo từng
              tháng.
            </p>
          </div>
        ) : (
          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metricMode === 'volume' ? (
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  barCategoryGap="16%"
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    opacity={0.6}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={formatCompactWeight}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="importKg"
                    name="Nhập phế (kg)"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="groundKg"
                    name="Xay phế (kg)"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="exportKg"
                    name="Xuất phế (kg)"
                    fill="#00668c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              ) : (
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="16%"
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    opacity={0.6}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={formatCompactMoney}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="#00668c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="importCost"
                    name="Mua phế"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="operatingCost"
                    name="Chi phí xưởng"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Chênh lệch bán − mua − chi"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
