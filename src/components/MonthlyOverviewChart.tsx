import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
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
import {
  BarChart3,
  Package,
  Truck,
  Cog,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CalendarRange,
} from 'lucide-react';
import { cn, formatKg, formatTien, formatNgay } from '../lib/utils';
import { today, daysAgo } from '../lib/date';
import {
  getRecentMonths,
  getDatesInRange,
  formatCompactWeight,
  formatCompactMoney,
  aggregateMonthlyStats,
  aggregateDailyStats,
  computeGrowth,
  type MonthlyStatItem,
} from '../lib/monthlyStats';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { grindingService } from '../services/grindingService';
import { expensesService } from '../services/expensesService';
import { attendanceService } from '../services/employeesService';
import type { Import, Export, Grinding, Expense, Attendance } from '../types';

export interface MonthlyOverviewChartProps {
  imports?: Import[];
  monthlyStats?: MonthlyStatItem[];
  exports?: Export[];
  grinding?: Grinding[];
  expenses?: Expense[];
  attendance?: Attendance[];
  canSeeFinance?: boolean;
  className?: string;
}

type MetricMode = 'volume' | 'finance';
type TimeHorizon = 'today' | '7d' | '30d' | 'custom' | '6m' | '12m' | 'year';

export const MonthlyOverviewChart: React.FC<MonthlyOverviewChartProps> = ({
  imports = [],
  exports = [],
  grinding = [],
  monthlyStats,
  expenses = [],
  attendance = [],
  canSeeFinance = false,
  className,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('volume');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('7d');
  const [customFrom, setCustomFrom] = useState<string>(() => daysAgo(6));
  const [customTo, setCustomTo] = useState<string>(() => today());

  const isDailyMode =
    timeHorizon === 'today' || timeHorizon === '7d' || timeHorizon === '30d' || timeHorizon === 'custom';

  const activeDateRange = useMemo(() => {
    if (timeHorizon === 'today') {
      const t = today();
      return { from: t, to: t };
    }
    if (timeHorizon === '7d') {
      return { from: daysAgo(6), to: today() };
    }
    if (timeHorizon === '30d') {
      return { from: daysAgo(29), to: today() };
    }
    const f = customFrom || today();
    const t = customTo || today();
    return f <= t ? { from: f, to: t } : { from: t, to: f };
  }, [timeHorizon, customFrom, customTo]);

  // Tải dữ liệu chi tiết theo ngày khi ở chế độ xem theo ngày (Hôm nay / 7 ngày / 30 ngày / Từ ngày - Đến ngày)
  const [dailyFetched, setDailyFetched] = useState<{
    imports: Import[];
    exports: Export[];
    grinding: Grinding[];
    expenses: Expense[];
    attendance: Attendance[];
    loading: boolean;
  }>({
    imports: [],
    exports: [],
    grinding: [],
    expenses: [],
    attendance: [],
    loading: false,
  });

  const hasPassedRawLists = imports.length > 0 || exports.length > 0 || grinding.length > 0;

  useEffect(() => {
    if (!isDailyMode || hasPassedRawLists) return;
    let cancelled = false;
    setDailyFetched((prev) => ({ ...prev, loading: true }));

    Promise.all([
      importsService.getAll({ from: activeDateRange.from, to: activeDateRange.to, all: true }),
      exportsService.getAll({ from: activeDateRange.from, to: activeDateRange.to, all: true }),
      grindingService.getAll({ from: activeDateRange.from, to: activeDateRange.to, all: true }),
      canSeeFinance
        ? expensesService.getExpenses({ from: activeDateRange.from, to: activeDateRange.to, all: true })
        : Promise.resolve([]),
      canSeeFinance
        ? attendanceService.getAttendance({ from: activeDateRange.from, to: activeDateRange.to, all: true })
        : Promise.resolve([]),
    ])
      .then(([imp, exp, grd, exps, att]) => {
        if (cancelled) return;
        setDailyFetched({
          imports: imp,
          exports: exp,
          grinding: grd,
          expenses: exps,
          attendance: att,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDailyFetched((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [isDailyMode, hasPassedRawLists, activeDateRange.from, activeDateRange.to, canSeeFinance]);

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
    return getRecentMonths(6, now);
  }, [timeHorizon]);

  // Tổng hợp dữ liệu biểu đồ (theo ngày hoặc theo tháng)
  const chartData = useMemo(() => {
    if (isDailyMode) {
      const dates = getDatesInRange(activeDateRange.from, activeDateRange.to, 90);
      const srcImports = hasPassedRawLists ? imports : dailyFetched.imports;
      const srcExports = hasPassedRawLists ? exports : dailyFetched.exports;
      const srcGrinding = hasPassedRawLists ? grinding : dailyFetched.grinding;
      const srcExpenses = hasPassedRawLists ? expenses : dailyFetched.expenses;
      const srcAttendance = hasPassedRawLists ? attendance : dailyFetched.attendance;

      return aggregateDailyStats({
        dates,
        imports: srcImports,
        exports: srcExports,
        grinding: srcGrinding,
        expenses: srcExpenses,
        attendance: srcAttendance,
      });
    }

    if (monthlyStats) {
      return targetMonths
        .map(
          (month) =>
            monthlyStats.find((row) => row.month === month) ?? {
              month,
              label: `Thg ${ parseInt(month.split('-')[1], 10) }/${month.slice(2, 4)}`,
              shortLabel: `T${parseInt(month.split('-')[1], 10)}`,
              importKg: 0,
              groundKg: 0,
              exportKg: 0,
              exportBags: 0,
              importCost: 0,
              revenue: 0,
              operatingCost: 0,
              profit: 0,
            },
        )
        .filter(Boolean);
    }
    return aggregateMonthlyStats({
      months: targetMonths,
      imports,
      exports,
      grinding,
      expenses,
      attendance,
    });
  }, [
    isDailyMode,
    activeDateRange.from,
    activeDateRange.to,
    hasPassedRawLists,
    imports,
    exports,
    grinding,
    expenses,
    attendance,
    dailyFetched,
    monthlyStats,
    targetMonths,
  ]);

  // Số liệu hiển thị trên 4 thẻ tóm tắt:
  // - Nếu xem theo ngày (Hôm nay / 7 ngày / 30 ngày / Từ ngày - Đến ngày): cộng tổng đúng khoảng ngày đó
  // - Nếu xem theo tháng (6m / 12m / year): lấy tháng mới nhất
  const highlightItem = useMemo<MonthlyStatItem | undefined>(() => {
    if (!chartData.length) return undefined;
    if (!isDailyMode) {
      return chartData[chartData.length - 1];
    }
    const labelSuffix =
      timeHorizon === 'today'
        ? 'Hôm nay'
        : timeHorizon === '7d'
          ? '7 ngày'
          : timeHorizon === '30d'
            ? '30 ngày'
            : 'Kỳ chọn';
    return chartData.reduce<MonthlyStatItem>(
      (acc, cur) => ({
        month: activeDateRange.to,
        label: labelSuffix,
        shortLabel: labelSuffix,
        importKg: acc.importKg + cur.importKg,
        groundKg: acc.groundKg + cur.groundKg,
        exportKg: acc.exportKg + cur.exportKg,
        exportBags: acc.exportBags + cur.exportBags,
        importCost: acc.importCost + cur.importCost,
        revenue: acc.revenue + cur.revenue,
        operatingCost: acc.operatingCost + cur.operatingCost,
        profit: acc.profit + cur.profit,
      }),
      {
        month: activeDateRange.to,
        label: labelSuffix,
        shortLabel: labelSuffix,
        importKg: 0,
        groundKg: 0,
        exportKg: 0,
        exportBags: 0,
        importCost: 0,
        revenue: 0,
        operatingCost: 0,
        profit: 0,
      },
    );
  }, [chartData, isDailyMode, timeHorizon, activeDateRange.to]);

  const previousItem = !isDailyMode && chartData.length > 1 ? chartData[chartData.length - 2] : undefined;

  const importGrowth = useMemo(
    () => computeGrowth(highlightItem?.importKg || 0, previousItem?.importKg || 0),
    [highlightItem, previousItem],
  );

  const exportGrowth = useMemo(
    () => computeGrowth(highlightItem?.exportKg || 0, previousItem?.exportKg || 0),
    [highlightItem, previousItem],
  );

  const revenueGrowth = useMemo(
    () => computeGrowth(highlightItem?.revenue || 0, previousItem?.revenue || 0),
    [highlightItem, previousItem],
  );

  const profitGrowth = useMemo(
    () => computeGrowth(highlightItem?.profit || 0, previousItem?.profit || 0),
    [highlightItem, previousItem],
  );

  // Kiểm tra có dữ liệu không (Ở chế độ Hôm nay hoặc Từ ngày - Đến ngày vẫn luôn vẽ trục ngày để thấy cột Hôm nay)
  const hasData = useMemo(() => {
    if (isDailyMode) return chartData.length > 0;
    return chartData.some(
      (m) => m.importKg > 0 || m.groundKg > 0 || m.exportKg > 0 || m.revenue > 0 || m.operatingCost > 0,
    );
  }, [chartData, isDailyMode]);

  // Custom tooltip hiển thị đẹp, rõ ràng cả trên Desktop và Mobile
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentItem: MonthlyStatItem | undefined = payload[0]?.payload;
    const headerTitle = currentItem?.month
      ? currentItem.month.length === 10
        ? `Ngày ${formatNgay(currentItem.month)}`
        : `Tháng ${currentItem.month.split('-')[1]}/${currentItem.month.split('-')[0]}`
      : label;

    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] p-3 rounded-xl shadow-lg text-xs space-y-2 min-w-[190px] sm:min-w-[220px]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Calendar size={13} className="text-[var(--primary-500)]" />
            {headerTitle}
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
                Chi vận hành:
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
        'monthly-overview card p-4 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4 transition-all',
        className,
      )}
    >
      {/* HEADER: Title & Interactive Controls */}
      <div className="monthly-heading flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-300)]">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                {isDailyMode ? 'Biểu đồ hoạt động theo ngày' : 'Biểu đồ hoạt động theo tháng'}
              </h3>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
                {isDailyMode
                  ? `Kỳ: ${formatNgay(activeDateRange.from)} – ${formatNgay(activeDateRange.to)}`
                  : metricMode === 'volume'
                    ? 'Sản lượng nhập, xay và xuất theo tháng'
                    : 'Giá trị bán, mua và chi phí theo tháng'}
              </p>
            </div>
          </div>

          {/* Tabs: Sản lượng vs Tài chính (nếu có quyền) */}
          {canSeeFinance && (
            <div className="inline-flex self-start sm:self-auto p-0.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-semibold">
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
        </div>

        {/* Hàng nút chọn nhanh kỳ xem + Bộ lọc Từ ngày - Đến ngày */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]/60">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { id: 'today', label: 'Hôm nay' },
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: '6m', label: '6 tháng' },
                { id: '12m', label: '12 tháng' },
                { id: 'year', label: `Năm ${new Date().getFullYear()}` },
                { id: 'custom', label: 'Tùy chọn ngày' },
              ] as const
            ).map((tab) => {
              const active = timeHorizon === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTimeHorizon(tab.id);
                    if (tab.id === 'today') {
                      const t = today();
                      setCustomFrom(t);
                      setCustomTo(t);
                    } else if (tab.id === '7d') {
                      setCustomFrom(daysAgo(6));
                      setCustomTo(today());
                    } else if (tab.id === '30d') {
                      setCustomFrom(daysAgo(29));
                      setCustomTo(today());
                    }
                  }}
                  className={cn(
                    'h-7 shrink-0 rounded-lg border px-2.5 text-[11px] font-bold transition-all duration-150 cursor-pointer whitespace-nowrap',
                    active
                      ? 'border-[var(--primary-500)] bg-[var(--primary-500)] text-white shadow-2xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Bộ lọc Từ ngày – Đến ngày hiển thị trực tiếp */}
          <div className="flex items-center gap-1.5 shrink-0">
            <CalendarRange size={14} className="text-[var(--primary-500)] shrink-0 hidden sm:block" />
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">Từ</span>
            <input
              type="date"
              aria-label="Biểu đồ từ ngày"
              value={isDailyMode ? activeDateRange.from : customFrom}
              max={isDailyMode ? activeDateRange.to : customTo}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setTimeHorizon('custom');
              }}
              className="input-field !min-h-7 !py-1 !px-2 !text-xs flex-1 sm:w-auto font-mono"
            />
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">đến</span>
            <input
              type="date"
              aria-label="Biểu đồ đến ngày"
              value={isDailyMode ? activeDateRange.to : customTo}
              min={isDailyMode ? activeDateRange.from : customFrom}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setTimeHorizon('custom');
              }}
              className="input-field !min-h-7 !py-1 !px-2 !text-xs flex-1 sm:w-auto font-mono"
            />
          </div>
        </div>
      </div>

      {/* MOBILE-FIRST HIGHLIGHT CARDS: Tóm tắt kỳ đang chọn */}
      {highlightItem && (
        <div className="monthly-highlights grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1">
          {metricMode === 'volume' ? (
            <>
              {/* Nhập phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Package size={12} /> Nhập {highlightItem.shortLabel}
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
                  {formatKg(highlightItem.importKg)}
                </p>
              </div>

              {/* Xay phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Cog size={12} /> Xay {highlightItem.shortLabel}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-amber-900 dark:text-amber-200 truncate">
                  {formatKg(highlightItem.groundKg)}
                </p>
              </div>

              {/* Xuất phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Truck size={12} /> Xuất {highlightItem.shortLabel}
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
                  {formatKg(highlightItem.exportKg)}
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
                  {highlightItem.exportBags} bao
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
                  {formatTien(highlightItem.revenue)} đ
                </p>
              </div>

              {/* Tiền mua phế */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Mua phế</span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-amber-900 dark:text-amber-200 truncate">
                  {formatTien(highlightItem.importCost)} đ
                </p>
              </div>

              {/* Chi phí vận hành */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-0.5">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    Chi vận hành
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black font-mono text-rose-900 dark:text-rose-200 truncate">
                  {formatTien(highlightItem.operatingCost)} đ
                </p>
              </div>

              {/* Chênh lệch bán − mua − chi */}
              <div
                className={cn(
                  'p-2.5 sm:p-3 rounded-xl border',
                  highlightItem.profit >= 0
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50',
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1',
                      highlightItem.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700',
                    )}
                  >
                    {highlightItem.profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    Chênh lệch
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
                    highlightItem.profit >= 0
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-rose-900 dark:text-rose-200',
                  )}
                >
                  {formatTien(highlightItem.profit)} đ
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {metricMode === 'finance' && (
        <p className="monthly-formula text-[11px] leading-relaxed text-[var(--text-muted)]">
          Chênh lệch = bán − mua − chi vận hành (gồm lương), chưa tính giá vốn tồn kho.
        </p>
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
              Khi phát sinh phiếu nhập, xay hoặc xuất phế, biểu đồ sẽ tự động tổng hợp xu hướng.
            </p>
          </div>
        ) : (
          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metricMode === 'volume' ? (
                <BarChart
                  data={chartData}
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
                  data={chartData}
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
                    name="Chi vận hành"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Chênh lệch"
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
