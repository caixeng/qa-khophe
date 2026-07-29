import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Cog,
  Truck,
  Warehouse,
  Activity,
  Bell,
  Clock,
  ArrowRight,
  PlusCircle,
  Settings,
  Send,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn, formatTien, formatKg } from '../lib/utils';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';

// Mock Data
const recentActivities = [
  { id: 1, type: 'import', text: 'Nhập 2.085 kg từ A. Danh', time: '10 phút trước', amount: '+2.085 kg' },
  { id: 2, type: 'grind', text: 'Xay 14 bao (màu sáng)', time: '1 giờ trước', amount: '14 bao' },
  { id: 3, type: 'export', text: 'Xuất 18 bao cho Cty Nhựa Việt', time: '2 giờ trước', amount: '-18 bao' },
  { id: 4, type: 'expense', text: 'Chi xăng xe giao hàng', time: 'Hôm qua', amount: '-900.000đ' },
  { id: 5, type: 'import', text: 'Nhập 1.500 kg từ Em Hoàn', time: 'Hôm qua', amount: '+1.500 kg' },
];

const chartData = [
  { name: 'T2', 'Nhập (kg)': 1200, 'Xuất (kg)': 0 },
  { name: 'T3', 'Nhập (kg)': 2085, 'Xuất (kg)': 4500 },
  { name: 'T4', 'Nhập (kg)': 800, 'Xuất (kg)': 0 },
  { name: 'T5', 'Nhập (kg)': 1500, 'Xuất (kg)': 2000 },
  { name: 'T6', 'Nhập (kg)': 3000, 'Xuất (kg)': 16200 },
  { name: 'T7', 'Nhập (kg)': 4000, 'Xuất (kg)': 18000 },
  { name: 'CN', 'Nhập (kg)': 5420, 'Xuất (kg)': 16200 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'import': return <Package className="w-5 h-5 text-emerald-500" />;
      case 'grind': return <Cog className="w-5 h-5 text-amber-500" />;
      case 'export': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'expense': return <CreditCard className="w-5 h-5 text-rose-500" />;
      default: return <Activity className="w-5 h-5 text-slate-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'import': return 'bg-emerald-500/10';
      case 'grind': return 'bg-amber-500/10';
      case 'export': return 'bg-blue-500/10';
      case 'expense': return 'bg-rose-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Tổng quan" description="Hoạt động xưởng ngày hôm nay" />

      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Nhập hôm nay"
          value={formatKg(5420)}
          icon={Package}
          trend={12}
          color="success"
        />
        <KpiCard
          title="Xay hôm nay"
          value={formatKg(4180)}
          icon={Cog}
          trend={5}
          color="warning"
        />
        <KpiCard
          title="Xuất hôm nay"
          value="18 bao"
          icon={Truck}
          trend={-3}
          color="info"
        />
        <KpiCard
          title="Tồn kho"
          value="58 bao"
          icon={Warehouse}
          subtitle="~52.200 kg phế"
          color="primary"
        />
      </div>

      {/* Section 2: Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/phe?tab=nhap')}
          className="card p-4 flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
        >
          <div className="p-3 bg-emerald-500 rounded-full text-white shadow-sm">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Nhập phế</span>
        </button>

        <button
          onClick={() => navigate('/phe?tab=xay')}
          className="card p-4 flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/10"
        >
          <div className="p-3 bg-amber-500 rounded-full text-white shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <span className="font-semibold text-amber-700 dark:text-amber-400">Xay phế</span>
        </button>

        <button
          onClick={() => navigate('/phe?tab=xuat')}
          className="card p-4 flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10"
        >
          <div className="p-3 bg-blue-500 rounded-full text-white shadow-sm">
            <Send className="w-6 h-6" />
          </div>
          <span className="font-semibold text-blue-700 dark:text-blue-400">Xuất phế</span>
        </button>

        <button
          onClick={() => navigate('/tai-chinh?tab=chiphi')}
          className="card p-4 flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40 hover:shadow-rose-500/10"
        >
          <div className="p-3 bg-rose-500 rounded-full text-white shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <span className="font-semibold text-rose-700 dark:text-rose-400">Ghi chi phí</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 3: Recent Activities */}
        <div className="card lg:col-span-2">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Hoạt động gần đây
            </h3>
            <button className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1 font-medium">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4">
                  <div className={cn('p-2 rounded-full', getActivityColor(activity.type))}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {activity.text}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {activity.time}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {activity.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3 Right: Alerts */}
        <div className="space-y-6">
          <div className="card">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-500" />
                Cảnh báo & Nhắc nhở
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">3 lô phế chưa xay</h4>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">Cần ưu tiên xử lý trong hôm nay.</p>
                </div>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Công nợ phải thu cao</h4>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">{formatTien(15200000)} cần thu hồi.</p>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Tồn kho ổn định</h4>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Mức tồn kho nằm trong ngưỡng an toàn.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Mini Chart */}
      <div className="card p-4">
        <h3 className="font-semibold mb-4 ml-2">Thống kê Nhập/Xuất 7 ngày qua</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e2e8f0)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `${val/1000}k`} />
              <Tooltip 
                cursor={{ fill: 'var(--bg-surface, #f8fafc)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Nhập (kg)" fill="var(--primary-500, #3b82f6)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Xuất (kg)" fill="var(--color-success, #10b981)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
