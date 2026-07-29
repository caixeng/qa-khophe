import * as React from 'react';
import { useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatKg, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { useAsyncData } from '../hooks/useAsyncData';
import { grindingService } from '../services/grindingService';
import { exportsService } from '../services/exportsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TonKhoPage: React.FC = () => {
  const { data: grindingData, loading: gLoading, error: gError } = useAsyncData(grindingService.getAll, []);
  const { data: exportsData, loading: eLoading, error: eError } = useAsyncData(exportsService.getAll, []);

  const grinding = grindingData || [];
  const exports = exportsData || [];

  const inventoryStats = useMemo(() => {
    const totalGround = grinding.reduce((sum, g) => sum + (Number(g.output_quantity_kg) || 0), 0);
    const totalExported = exports.reduce((sum, e) => sum + (Number(e.total_quantity_kg) || 0), 0);
    const currentStockKg = Math.max(0, totalGround - totalExported);
    const currentBags = Math.round(currentStockKg / 900);

    return {
      totalGround,
      totalExported,
      currentStockKg,
      currentBags
    };
  }, [grinding, exports]);

  const historyEvents = useMemo(() => {
    const events: { id: string; date: string; type: 'in' | 'out'; amount: number; note: string }[] = [];

    grinding.forEach((g) => {
      if (g.output_quantity_kg > 0) {
        events.push({
          id: `g-${g.id}`,
          date: g.date,
          type: 'in',
          amount: g.output_quantity_kg,
          note: `Xay thành phẩm ${g.bags_count ? `(${g.bags_count} bao)` : ''}`
        });
      }
    });

    exports.forEach((e) => {
      events.push({
        id: `e-${e.id}`,
        date: e.date,
        type: 'out',
        amount: -e.total_quantity_kg,
        note: `Xuất bán ${e.contact_name || 'Khách'} (${e.bags_count || 0} bao)`
      });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [grinding, exports]);

  const chartData = [
    { date: '01/07', amount: 36000 },
    { date: '05/07', amount: 41000 },
    { date: '10/07', amount: 38000 },
    { date: '15/07', amount: 45000 },
    { date: '20/07', amount: 50000 },
    { date: '25/07', amount: 48000 },
    { date: 'Hiện tại', amount: inventoryStats.currentStockKg || 52200 },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader title="Tồn Kho & Biến Động Phế" subtitle="Theo dõi tồn kho bột nhựa và sản lượng luân chuyển thực tế" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Tồn đầu kỳ" value={formatKg(36000)} icon={Calendar} color="info" />
        <KpiCard title="Xay ra trong tháng" value={formatKg(inventoryStats.totalGround)} icon={TrendingUp} color="success" />
        <KpiCard title="Xuất trong tháng" value={formatKg(inventoryStats.totalExported)} icon={TrendingDown} color="warning" />
        <KpiCard title="Tồn hiện tại" value={`${formatKg(inventoryStats.currentStockKg)} (~${inventoryStats.currentBags} bao)`} icon={Package} color="primary" />
      </div>

      {/* Chart */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Biểu đồ biến động tồn kho phế</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
              <YAxis tickFormatter={(val) => `${val / 1000}T`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dx={-10} />
              <Tooltip formatter={(value: number) => [`${formatKg(value)}`, 'Tồn kho']} cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }} />
              <Line type="monotone" dataKey="amount" stroke="var(--primary-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary-500)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Lịch sử xuất / nhập kho phế</h3>
        <DataState loading={gLoading || eLoading} error={gError || eError} isEmpty={historyEvents.length === 0} emptyTitle="Chưa có biến động kho">
          <div className="erp-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="th-cell">Ngày</th>
                    <th className="th-cell">Loại giao dịch</th>
                    <th className="th-cell text-right">Khối lượng (kg)</th>
                    <th className="th-cell">Diễn giải</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEvents.map((ev) => (
                    <tr key={ev.id} className="tr-hover">
                      <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">{formatNgay(ev.date)}</td>
                      <td className="td-cell">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ev.type === 'in' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                          {ev.type === 'in' ? '▲ Xay nhập kho' : '▼ Xuất bán kho'}
                        </span>
                      </td>
                      <td className={`td-cell text-right font-mono font-bold text-xs ${ev.type === 'in' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {ev.type === 'in' ? `+${formatKg(ev.amount)}` : formatKg(ev.amount)}
                      </td>
                      <td className="td-cell text-xs text-[var(--text-primary)]">{ev.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataState>
      </div>
    </div>
  );
};
