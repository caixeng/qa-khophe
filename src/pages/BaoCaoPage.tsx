import * as React from 'react';
import { useState, useMemo } from 'react';
import { Download, Package, TrendingUp, DollarSign } from 'lucide-react';
import { cn, formatTien, formatKg } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuth } from '../contexts/AuthContext';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { expensesService } from '../services/expensesService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#00668c', '#059669', '#d97706', '#64748b', '#7c3aed', '#e11d48'];

export const BaoCaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tongquan' | 'nhapxuat' | 'taichinh'>('tongquan');
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'manager' || user?.role === 'admin';

  const { data: importsData, loading: impLoading } = useAsyncData(importsService.getAll, []);
  const { data: exportsData, loading: expLoading } = useAsyncData(exportsService.getAll, []);
  const { data: expensesData, loading: expesLoading } = useAsyncData(
    canSeeFinance ? expensesService.getExpenses : async () => [],
    [canSeeFinance]
  );

  const imports = importsData || [];
  const exports = exportsData || [];
  const expenses = expensesData || [];

  const summary = useMemo(() => {
    const totalImportKg = imports.reduce((sum, i) => sum + (Number(i.quantity_kg) || 0), 0);
    const totalImportCost = imports.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

    const totalExportKg = exports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const totalRevenue = exports.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

    const totalOperatingCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const estimatedProfit = totalRevenue - totalImportCost - totalOperatingCost;

    return {
      totalImportKg,
      totalImportCost,
      totalExportKg,
      totalRevenue,
      totalOperatingCost,
      estimatedProfit
    };
  }, [imports, exports, expenses]);

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

    imports.forEach(i => {
      if (!datesMap[i.date]) datesMap[i.date] = { importKg: 0, exportKg: 0 };
      datesMap[i.date].importKg += Number(i.quantity_kg) || 0;
    });

    exports.forEach(e => {
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
        ['BÁO CÁO TỔNG QUAN XƯỞNG PHẾ QA KHOPHE'],
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
          ['Chi phí vận hành xưởng (VNĐ)', summary.totalOperatingCost],
          ['Lợi nhuận gộp ước tính (VNĐ)', summary.estimatedProfit],
        );
      }
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan');

      const importRows = [
        ['Ngày', 'Nhà cung cấp', 'Khối lượng (kg)', 'Đơn giá', 'Thành tiền', 'Thanh toán', 'Xử lý'],
        ...imports.map((i) => [i.date, i.contact_name || 'Khách lẻ', i.quantity_kg, i.price_per_kg, i.total_amount, i.payment_status, i.processing_status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(importRows), 'Nhập phế');

      const exportRows = [
        ['Ngày', 'Khách hàng', 'Số bao', 'Khối lượng (kg)', 'Đơn giá', 'Thành tiền', 'Thanh toán'],
        ...exports.map((e) => [e.date, e.contact_name || 'Khách lẻ', e.bags_count, e.total_kg, e.price_per_kg, e.total_amount, e.payment_status]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportRows), 'Xuất phế');

      if (canSeeFinance) {
        const expenseRows = [
          ['Ngày', 'Danh mục', 'Số tiền', 'Diễn giải', 'Ghi chú'],
          ...expenses.map((e) => [e.date, e.category, e.amount, e.description || '', e.notes || '']),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseRows), 'Chi phí');
      }

      XLSX.writeFile(wb, `BaoCao_KhoPhe_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const loading = impLoading || expLoading || expesLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Báo cáo & Thống kê"
        subtitle="Tổng hợp chi tiết sản lượng phế liệu và tài chính"
        action={{
          label: exporting ? 'Đang xuất...' : 'Xuất Excel (.xlsx)',
          icon: Download,
          onClick: handleExportExcel,
        }}
      />

      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('tongquan')}
          className={cn(
            'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
            activeTab === 'tongquan'
              ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          Phân bổ nguồn phế
        </button>
        {canSeeFinance && (
          <button
            onClick={() => setActiveTab('taichinh')}
            className={cn(
              'px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer',
              activeTab === 'taichinh'
                ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            Cơ cấu chi phí
          </button>
        )}
      </div>

      <DataState loading={loading} error={null} isEmpty={false}>
        {activeTab === 'tongquan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Tổng nhập phế" value={formatKg(summary.totalImportKg)} subtitle={formatTien(summary.totalImportCost)} icon={Package} color="success" />
              <KpiCard title="Tổng xuất phế" value={formatKg(summary.totalExportKg)} subtitle={formatTien(summary.totalRevenue)} icon={TrendingUp} color="info" />
              {canSeeFinance && <KpiCard title="Chi phí vận hành" value={formatTien(summary.totalOperatingCost)} icon={DollarSign} color="danger" />}
              {canSeeFinance && <KpiCard title="Lợi nhuận ước tính" value={formatTien(summary.estimatedProfit)} icon={DollarSign} color="primary" />}
            </div>

            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Biểu đồ so sánh sản lượng Nhập vs Xuất theo ngày</h3>
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
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Tỷ lệ khối lượng phế nhập theo Nhà cung cấp</h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={supplierDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name}: ${formatKg(entry.value)}`}>
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

        {activeTab === 'taichinh' && (
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Cơ cấu chi phí vận hành kho</h3>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name}: ${formatTien(entry.value)}`}>
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
