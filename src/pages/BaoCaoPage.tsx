import * as React from 'react';
import { useState, useMemo } from 'react';
import { Download, Package, TrendingUp, DollarSign } from 'lucide-react';
import { cn, formatTien, formatKg } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { expensesService } from '../services/expensesService';
import { grindingService } from '../services/grindingService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#00668c', '#059669', '#d97706', '#64748b', '#7c3aed', '#e11d48'];

export const BaoCaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tongquan' | 'nhapxuat' | 'taichinh'>('tongquan');

  const { data: importsData, loading: impLoading } = useAsyncData(importsService.getAll, []);
  const { data: exportsData, loading: expLoading } = useAsyncData(exportsService.getAll, []);
  const { data: expensesData, loading: expesLoading } = useAsyncData(expensesService.getExpenses, []);
  const { data: grindingData, loading: grdLoading } = useAsyncData(grindingService.getAll, []);

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

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng quan
    const summarySheetData = [
      ['BÁO CÁO TỔNG QUAN XƯỞNG KHÔ PHẾ'],
      ['Ngày xuất báo cáo', new Date().toLocaleDateString('vi-VN')],
      [],
      ['Chỉ số', 'Giá trị'],
      ['Tổng phế nhập (kg)', summary.totalImportKg],
      ['Tổng tiền phế nhập (VNĐ)', summary.totalImportCost],
      ['Tổng phế xuất (kg)', summary.totalExportKg],
      ['Tổng doanh thu (VNĐ)', summary.totalRevenue],
      ['Tổng chi phí vận hành (VNĐ)', summary.totalOperatingCost],
      ['Lợi nhuận ước tính (VNĐ)', summary.estimatedProfit],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng quan');

    // Sheet 2: Phiếu nhập phế
    const importsSheetData = imports.map((i) => ({
      'Ngày': i.date,
      'Nhà cung cấp': i.contact_name,
      'Khối lượng (kg)': i.quantity_kg,
      'Đơn giá (đ/kg)': i.price_per_kg,
      'Tổng tiền (đ)': i.total_amount,
      'Thanh toán': i.payment_status,
      'Xử lý': i.processing_status
    }));
    const wsImports = XLSX.utils.json_to_sheet(importsSheetData);
    XLSX.utils.book_append_sheet(wb, wsImports, 'Phiếu nhập phế');

    // Sheet 3: Phiếu xuất bán
    const exportsSheetData = exports.map((e) => ({
      'Ngày': e.date,
      'Khách hàng': e.contact_name,
      'Số bao': e.bags_count,
      'Tổng kg': e.total_quantity_kg,
      'Đơn giá (đ/kg)': e.price_per_kg,
      'Tổng tiền (đ)': e.total_amount,
      'Thanh toán': e.payment_status
    }));
    const wsExports = XLSX.utils.json_to_sheet(exportsSheetData);
    XLSX.utils.book_append_sheet(wb, wsExports, 'Phiếu xuất bán');

    // Download file
    XLSX.writeFile(wb, `BaoCao_KhoPhe_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isLoading = impLoading || expLoading || expesLoading || grdLoading;

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader 
        title="Báo Cáo & Thống Kê" 
        subtitle="Tổng hợp hiệu quả vận hành, doanh thu, lợi nhuận và xuất file Excel"
        action={{ label: 'Xuất Excel (.xlsx)', icon: Download, onClick: handleExportExcel }} 
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[var(--border-color)]">
        {[
          { id: 'tongquan', label: 'Tổng quan' },
          { id: 'nhapxuat', label: 'Nhập - Xuất' },
          { id: 'taichinh', label: 'Tài chính' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3 px-4 font-bold text-xs transition-all border-b-2 cursor-pointer",
              activeTab === tab.id
                ? "border-[var(--primary-500)] text-[var(--primary-500)] bg-[var(--primary-50)]/40 rounded-t-xl"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataState loading={isLoading} error={null} isEmpty={false}>
        {activeTab === 'tongquan' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Tổng nhập phế" value={formatKg(summary.totalImportKg)} icon={Package} color="info" />
              <KpiCard title="Tổng xuất phế" value={formatKg(summary.totalExportKg)} icon={TrendingUp} color="success" />
              <KpiCard title="Chi phí vận hành" value={formatTien(summary.totalOperatingCost)} icon={DollarSign} color="warning" />
              <KpiCard title="Lợi nhuận ước tính" value={formatTien(summary.estimatedProfit)} icon={TrendingUp} color="primary" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Sản lượng Nhập vs Xuất</h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Tháng này', nhap: summary.totalImportKg, xuat: summary.totalExportKg }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <YAxis tickFormatter={(val) => `${val / 1000}T`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <Tooltip formatter={(val: number) => formatKg(val)} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }} />
                      <Legend />
                      <Bar dataKey="nhap" name="Phế nhập (kg)" fill="#00668c" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="xuat" name="Phế xuất (kg)" fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Phân bổ nguồn phế nhập theo NCC</h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={supplierDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {supplierDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatKg(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nhapxuat' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiCard title="Tổng tiền mua phế" value={formatTien(summary.totalImportCost)} icon={Package} color="info" />
              <KpiCard title="Tổng doanh thu xuất" value={formatTien(summary.totalRevenue)} icon={TrendingUp} color="success" />
            </div>
          </div>
        )}

        {activeTab === 'taichinh' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="Doanh thu xuất phế" value={formatTien(summary.totalRevenue)} icon={TrendingUp} color="success" />
              <KpiCard title="Tiền mua phế" value={formatTien(summary.totalImportCost)} icon={Package} color="warning" />
              <KpiCard title="Lợi nhuận gộp ước tính" value={formatTien(summary.estimatedProfit)} icon={DollarSign} color="primary" />
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
};
