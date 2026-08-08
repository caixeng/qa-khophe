import * as React from 'react';
import { useState, useMemo } from 'react';
import { Download, Package, TrendingUp, DollarSign } from 'lucide-react';
import { cn, formatTien, formatKg } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { useAsyncList } from '../hooks/useAsyncData';
import { useDateRange } from '../hooks/useDateRange';
import { PeriodFilter } from '../components/PeriodFilter';
import { useAuth } from '../contexts/auth';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { grindingService } from '../services/grindingService';
import { expensesService } from '../services/expensesService';
import { attendanceService } from '../services/employeesService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { today, toISODate } from '../lib/date';

const COLORS = ['#00668c', '#059669', '#d97706', '#64748b', '#7c3aed', '#e11d48'];

export const BaoCaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tongquan' | 'nhapxuat' | 'hieusuat' | 'taichinh'>('tongquan');
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'manager' || user?.role === 'admin';

  const { range, setRange } = useDateRange();

  // Toàn bộ báo cáo tính theo kỳ đang chọn — trước đây mọi con số đều cộng dồn
  // toàn bộ lịch sử, nên "lãi ước tính" không gắn với khoảng thời gian nào cả
  // và không dùng được để so sánh tháng này với tháng trước.
  const { data: imports, loading: impLoading } = useAsyncList(
    () => importsService.getAll({ from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const { data: exports, loading: expLoading } = useAsyncList(
    () => exportsService.getAll({ from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const { data: grinding } = useAsyncList(
    () => grindingService.getAll({ from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const { data: expenses, loading: expesLoading } = useAsyncList(
    canSeeFinance ? () => expensesService.getExpenses({ from: range.from, to: range.to }) : async () => [],
    [canSeeFinance, range.from, range.to],
  );
  // Lương công nhân là chi phí vận hành thật — thiếu khoản này thì "lợi nhuận"
  // trên báo cáo luôn cao hơn thực tế đúng bằng tổng quỹ lương trong kỳ.
  const { data: attendance } = useAsyncList(
    canSeeFinance
      ? () => attendanceService.getAttendance({ from: range.from, to: range.to })
      : async () => [],
    [canSeeFinance, range.from, range.to],
  );

  /**
   * Kỳ liền trước, CÙNG ĐỘ DÀI với kỳ đang xem — để "% so với kỳ trước" so
   * sánh đúng nghĩa (7 ngày so với 7 ngày liền trước, không phải so với cả
   * tháng trước). Không dùng số tuyệt đối một mình: quản lý cần biết đang đi
   * lên hay đi xuống, chứ một con số đơn lẻ không nói lên điều đó.
   */
  const previousRange = useMemo(() => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const lengthDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - lengthDays + 1);
    return { from: toISODate(prevFrom), to: toISODate(prevTo) };
  }, [range.from, range.to]);

  const { data: prevImports } = useAsyncList(
    () => importsService.getAll({ from: previousRange.from, to: previousRange.to }),
    [previousRange.from, previousRange.to],
  );
  const { data: prevExports } = useAsyncList(
    () => exportsService.getAll({ from: previousRange.from, to: previousRange.to }),
    [previousRange.from, previousRange.to],
  );
  const { data: prevExpenses } = useAsyncList(
    canSeeFinance
      ? () => expensesService.getExpenses({ from: previousRange.from, to: previousRange.to })
      : async () => [],
    [canSeeFinance, previousRange.from, previousRange.to],
  );
  const { data: prevAttendance } = useAsyncList(
    canSeeFinance
      ? () => attendanceService.getAttendance({ from: previousRange.from, to: previousRange.to })
      : async () => [],
    [canSeeFinance, previousRange.from, previousRange.to],
  );

  const previousSummary = useMemo(() => {
    const totalImportKg = prevImports.reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const totalExportKg = prevExports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const totalRevenue = prevExports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
    const totalImportCost = prevImports.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    const totalOperatingCost =
      prevExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      prevAttendance.reduce((sum, a) => sum + (Number(a.net_pay) || 0), 0);
    const estimatedProfit = totalRevenue - totalImportCost - totalOperatingCost;

    return { totalImportKg, totalExportKg, totalOperatingCost, estimatedProfit };
  }, [prevImports, prevExports, prevExpenses, prevAttendance]);

  /** % thay đổi so với kỳ trước. null = không tính được (kỳ trước = 0). */
  function pctChange(curr: number, prev: number): number | null {
    if (prev === 0) return null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
  }

  /**
   * Hiệu suất xay: tỷ lệ hao hụt theo từng thợ.
   *
   * Đây là con số quyết định lãi thật của xưởng — cùng một lô phế, chênh 5%
   * hao hụt là chênh vài triệu đồng. Gộp theo thợ để thấy được chỗ nào đang
   * hao bất thường thay vì chỉ nhìn một tỷ lệ trung bình chung.
   */
  const grindingEfficiency = useMemo(() => {
    const byWorker: Record<string, { input: number; output: number; lots: number }> = {};

    grinding.forEach((g) => {
      const worker = g.worker?.trim() || 'Chưa ghi tên thợ';
      if (!byWorker[worker]) byWorker[worker] = { input: 0, output: 0, lots: 0 };
      byWorker[worker].input += Number(g.input_qty_kg) || 0;
      byWorker[worker].output += Number(g.output_qty_kg) || 0;
      byWorker[worker].lots += 1;
    });

    return Object.entries(byWorker)
      .map(([worker, v]) => ({
        worker,
        lots: v.lots,
        inputKg: v.input,
        outputKg: v.output,
        lossKg: v.input - v.output,
        lossPct: v.input > 0 ? ((v.input - v.output) / v.input) * 100 : 0,
      }))
      .sort((a, b) => b.lossPct - a.lossPct);
  }, [grinding]);

  const summary = useMemo(() => {
    const totalImportKg = imports.reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const totalImportCost = imports.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalExportKg = exports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const totalRevenue = exports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    const totalExpenseCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPayrollCost = attendance.reduce((sum, a) => sum + (Number(a.net_pay) || 0), 0);
    const totalOperatingCost = totalExpenseCost + totalPayrollCost;

    const estimatedProfit = totalRevenue - totalImportCost - totalOperatingCost;

    return {
      totalImportKg,
      totalImportCost,
      totalExportKg,
      totalRevenue,
      totalExpenseCost,
      totalPayrollCost,
      totalOperatingCost,
      estimatedProfit,
    };
  }, [imports, exports, expenses, attendance]);

  // Supplier distribution for Pie Chart
  const supplierDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    imports.forEach((i) => {
      const name = i.contact_name || 'Khách vãng lai';
      map[name] = (map[name] || 0) + (Number(i.quantity_kg) || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [imports]);

  // Expense distribution
  const expenseDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Khác';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // Combined daily chart data
  const dailyChartData = useMemo(() => {
    const datesMap: Record<string, { importKg: number; exportKg: number }> = {};

    imports.forEach((i) => {
      if (!datesMap[i.date]) datesMap[i.date] = { importKg: 0, exportKg: 0 };
      datesMap[i.date].importKg += Number(i.quantity_kg) || 0;
    });

    exports.forEach((e) => {
      if (!datesMap[e.date]) datesMap[e.date] = { importKg: 0, exportKg: 0 };
      datesMap[e.date].exportKg += Number(e.total_kg) || 0;
    });

    return Object.entries(datesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => ({
        date,
        'Nhập (kg)': val.importKg,
        'Xuất (kg)': val.exportKg,
      }));
  }, [imports, exports]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // xlsx nặng ~500KB — chỉ tải khi thực sự bấm xuất báo cáo
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const summaryData: (string | number)[][] = [
        ['BÁO CÁO TỔNG QUAN XƯỞNG PHẾ - VUA PHẾ'],
        ['Ngày xuất báo cáo', new Date().toLocaleDateString('vi-VN')],
        [],
        ['Chỉ số', 'Giá trị'],
        ['Tổng sản lượng nhập (kg)', summary.totalImportKg],
        ['Tổng chi phí mua phế (VNĐ)', summary.totalImportCost],
        ['Tổng sản lượng xuất (kg)', summary.totalExportKg],
        ['Tổng doanh thu xuất phế (VNĐ)', summary.totalRevenue],
      ];
      if (canSeeFinance) {
        summaryData.push(
          ['Chi phí xưởng (VNĐ)', summary.totalExpenseCost],
          ['Lương công nhân (VNĐ)', summary.totalPayrollCost],
          ['Tổng chi phí vận hành (VNĐ)', summary.totalOperatingCost],
          ['Lợi nhuận gộp ước tính (VNĐ)', summary.estimatedProfit],
        );
      }
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan');

      const importRows = [
        ['Ngày', 'Nhà cung cấp', 'Khối lượng (kg)', 'Đơn giá', 'Thành tiền', 'Thanh toán', 'Xử lý'],
        ...imports.map((i) => [
          i.date,
          i.contact_name || 'Khách lẻ',
          i.quantity_kg,
          i.price_per_kg,
          i.total_amount,
          i.payment_status,
          i.processing_status,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(importRows), 'Nhập phế');

      const exportRows = [
        ['Ngày', 'Khách hàng', 'Số bao', 'Khối lượng (kg)', 'Đơn giá', 'Thành tiền', 'Thanh toán'],
        ...exports.map((e) => [
          e.date,
          e.contact_name || 'Khách lẻ',
          e.bags_count,
          e.total_kg,
          e.price_per_kg,
          e.total_amount,
          e.payment_status,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportRows), 'Xuất phế');

      if (canSeeFinance) {
        const expenseRows = [
          ['Ngày', 'Danh mục', 'Số tiền', 'Diễn giải', 'Ghi chú'],
          ...expenses.map((e) => [e.date, e.category, e.amount, e.description || '', e.notes || '']),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseRows), 'Chi phí');

        const payrollRows = [
          ['Ngày', 'Nhân viên', 'Số công', 'Đơn giá/ngày', 'Tạm ứng', 'Thực lĩnh', 'Trạng thái'],
          ...attendance.map((a) => [
            a.date,
            a.employee_name,
            a.work_shift,
            a.daily_pay,
            a.advance_pay || 0,
            a.net_pay,
            a.payment_status,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payrollRows), 'Lương');
      }

      XLSX.writeFile(wb, `BaoCao_KhoPhe_${today()}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const loading = impLoading || expLoading || expesLoading;

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Báo cáo & Thống kê"
        subtitle="Tổng hợp chi tiết sản lượng phế liệu và tài chính"
        action={{
          label: exporting ? 'Đang xuất...' : 'Xuất Excel (.xlsx)',
          icon: Download,
          onClick: handleExportExcel,
        }}
      />

      <PeriodFilter range={range} onChange={setRange} />

      <div className="flex flex-wrap border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('tongquan')}
          className={cn(
            'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
            activeTab === 'tongquan'
              ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          Tổng quan sản lượng
        </button>
        <button
          onClick={() => setActiveTab('nhapxuat')}
          className={cn(
            'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
            activeTab === 'nhapxuat'
              ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          Phân bổ nguồn phế
        </button>
        <button
          onClick={() => setActiveTab('hieusuat')}
          className={cn(
            'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
            activeTab === 'hieusuat'
              ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
          )}
        >
          Hiệu suất xay
        </button>
        {canSeeFinance && (
          <button
            onClick={() => setActiveTab('taichinh')}
            className={cn(
              'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
              activeTab === 'taichinh'
                ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Cơ cấu chi phí
          </button>
        )}
      </div>

      <DataState loading={loading} error={null} isEmpty={false}>
        {activeTab === 'tongquan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <KpiCard
                title="Tổng nhập phế"
                value={formatKg(summary.totalImportKg)}
                subtitle={formatTien(summary.totalImportCost)}
                icon={Package}
                color="success"
                trend={pctChange(summary.totalImportKg, previousSummary.totalImportKg) ?? undefined}
              />
              <KpiCard
                title="Tổng xuất phế"
                value={formatKg(summary.totalExportKg)}
                subtitle={formatTien(summary.totalRevenue)}
                icon={TrendingUp}
                color="info"
                trend={pctChange(summary.totalExportKg, previousSummary.totalExportKg) ?? undefined}
              />
              {canSeeFinance && (
                <KpiCard
                  title="Chi phí vận hành"
                  value={formatTien(summary.totalOperatingCost)}
                  subtitle={`Gồm lương: ${formatTien(summary.totalPayrollCost)}`}
                  icon={DollarSign}
                  color="danger"
                  trend={(() => {
                    const pct = pctChange(summary.totalOperatingCost, previousSummary.totalOperatingCost);
                    // Chi phí tăng là tin xấu — đảo dấu "tích cực" so với quy ước tăng=xanh mặc định.
                    return pct === null ? undefined : { value: pct, isPositive: pct <= 0 };
                  })()}
                />
              )}
              {canSeeFinance && (
                <KpiCard
                  title="Lợi nhuận ước tính"
                  value={formatTien(summary.estimatedProfit)}
                  icon={DollarSign}
                  color="primary"
                  trend={pctChange(summary.estimatedProfit, previousSummary.estimatedProfit) ?? undefined}
                />
              )}
            </div>

            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                Biểu đồ so sánh sản lượng Nhập vs Xuất theo ngày
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip formatter={(val: any) => formatKg(Number(val) || 0)} />
                    <Legend />
                    <Bar dataKey="Nhập (kg)" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Xuất (kg)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nhapxuat' && (
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Tỷ lệ khối lượng phế nhập theo Nhà cung cấp
            </h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${formatKg(entry.value)}`}
                  >
                    {supplierDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatKg(Number(val) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'hieusuat' && (
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Tỷ lệ hao hụt khi xay theo thợ</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Sắp xếp theo mức hao hụt giảm dần. Cùng một lô phế, chênh vài phần trăm hao hụt là chênh vài
                triệu đồng — dòng trên cùng là chỗ đáng xem lại trước tiên.
              </p>
            </div>

            {grindingEfficiency.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                Chưa có phiếu xay nào trong kỳ này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Hiệu suất xay theo thợ</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="th-cell">
                        Thợ xay
                      </th>
                      <th scope="col" className="th-cell text-right">
                        Số lô
                      </th>
                      <th scope="col" className="th-cell text-right">
                        Đầu vào
                      </th>
                      <th scope="col" className="th-cell text-right">
                        Ra thành phẩm
                      </th>
                      <th scope="col" className="th-cell text-right">
                        Hao hụt
                      </th>
                      <th scope="col" className="th-cell text-right">
                        Tỷ lệ hao
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grindingEfficiency.map((row) => (
                      <tr key={row.worker} className="tr-hover">
                        <td className="td-cell text-xs font-bold text-[var(--text-primary)]">{row.worker}</td>
                        <td className="td-cell text-right font-mono text-xs">{row.lots}</td>
                        <td className="td-cell text-right font-mono text-xs">{formatKg(row.inputKg)}</td>
                        <td className="td-cell text-right font-mono text-xs">{formatKg(row.outputKg)}</td>
                        <td className="td-cell text-right font-mono text-xs">{formatKg(row.lossKg)}</td>
                        <td
                          className={cn(
                            'td-cell text-right font-mono text-xs font-bold',
                            row.lossPct > 10
                              ? 'text-rose-600'
                              : row.lossPct > 5
                                ? 'text-amber-600'
                                : 'text-emerald-600',
                          )}
                        >
                          {row.lossPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'taichinh' && (
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Cơ cấu chi phí vận hành kho</h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${formatTien(entry.value)}`}
                  >
                    {expenseDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatTien(Number(val) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
};
