import * as React from 'react';
import { useState, useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, ClipboardCheck } from 'lucide-react';
import { formatKg, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { Modal, FormField } from '../components/Modal';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { grindingService } from '../services/grindingService';
import { exportsService } from '../services/exportsService';
import { settingsService } from '../services/settingsService';
import { stockCountService } from '../services/stockCountService';
import { computeInventory } from '../lib/calc';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TonKhoPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canCount = user?.role === 'manager' || user?.role === 'admin';

  const { data: grinding, loading: gLoading, error: gError } = useAsyncList(grindingService.getAll, []);
  const { data: exports, loading: eLoading, error: eError } = useAsyncList(exportsService.getAll, []);
  const { data: kgPerBagData } = useAsyncData(settingsService.getKgPerBag, []);
  const { data: stockCounts, refetch: refetchStockCounts } = useAsyncList(stockCountService.getAll, []);

  const kgPerBag = kgPerBagData ?? 900;

  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [countedBags, setCountedBags] = useState<number>(0);
  const [countedKg, setCountedKg] = useState<number>(0);
  const [countNotes, setCountNotes] = useState('');
  const [savingCount, setSavingCount] = useState(false);

  const inventoryStats = useMemo(() => {
    const totalGround = grinding.reduce((sum, g) => sum + (Number(g.output_qty_kg) || 0), 0);
    const totalExported = exports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const { currentStockKg, currentBags } = computeInventory(totalGround, totalExported, kgPerBag);

    return {
      totalGround,
      totalExported,
      currentStockKg,
      currentBags,
    };
  }, [grinding, exports, kgPerBag]);

  const historyEvents = useMemo(() => {
    const events: { id: string; date: string; type: 'in' | 'out'; amount: number; note: string }[] = [];

    grinding.forEach((g) => {
      const outKg = g.output_qty_kg || 0;
      if (outKg > 0) {
        events.push({
          id: `g-${g.id}`,
          date: g.date,
          type: 'in',
          amount: outKg,
          note: `Xay thành phẩm ${g.bags_count ? `(${g.bags_count} bao)` : ''}`,
        });
      }
    });

    exports.forEach((e) => {
      const exportKg = e.total_kg || 0;
      events.push({
        id: `e-${e.id}`,
        date: e.date,
        type: 'out',
        amount: -exportKg,
        note: `Xuất bán ${e.contact_name || 'Khách'} (${e.bags_count || 0} bao)`,
      });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return events;
  }, [grinding, exports]);

  const chartData = useMemo(() => {
    type Movement = { date: string; delta: number };
    const movements: Movement[] = [
      ...grinding.map((g) => ({ date: g.date, delta: Number(g.output_qty_kg) || 0 })),
      ...exports.map((e) => ({ date: e.date, delta: -(Number(e.total_kg) || 0) })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    const byDate = new Map<string, number>();
    for (const m of movements) {
      running += m.delta;
      byDate.set(m.date, running);
    }

    return Array.from(byDate.entries()).map(([date, stockKg]) => ({
      date: formatNgay(date),
      'Tồn kho (kg)': Math.max(0, stockKg),
    }));
  }, [grinding, exports]);

  const loading = gLoading || eLoading;
  const error = gError || eError;

  const openCountModal = () => {
    setCountedBags(inventoryStats.currentBags);
    setCountedKg(inventoryStats.currentStockKg);
    setCountNotes('');
    setIsCountModalOpen(true);
  };

  const handleSaveCount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCount(true);
    try {
      await stockCountService.create({
        counted_bags: countedBags,
        counted_kg: countedKg,
        system_kg: inventoryStats.currentStockKg,
        notes: countNotes,
      });
      toast.success('Đã ghi nhận kết quả kiểm kê');
      setIsCountModalOpen(false);
      refetchStockCounts();
    } catch (err) {
      toast.error('Lỗi khi lưu kiểm kê');
      console.error(err);
    } finally {
      setSavingCount(false);
    }
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Tồn Kho Bột Nhựa"
        subtitle="Theo dõi biến động tồn kho thực tế tính theo số bao và tổng khối lượng kg"
        action={
          canCount ? { label: 'Kiểm kê kho', icon: ClipboardCheck, onClick: openCountModal } : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Tồn kho hiện tại"
          value={`${inventoryStats.currentBags} bao`}
          subtitle={`~${formatKg(inventoryStats.currentStockKg)}`}
          icon={Package}
          color="primary"
        />
        <KpiCard
          title="Tổng xay ra (Nhập kho)"
          value={formatKg(inventoryStats.totalGround)}
          icon={TrendingUp}
          color="success"
        />
        <KpiCard
          title="Tổng đã xuất bán"
          value={formatKg(inventoryStats.totalExported)}
          icon={TrendingDown}
          color="warning"
        />
      </div>

      {/* Chart */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Biểu đồ tồn kho thành phẩm</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip formatter={(value: any) => [formatKg(Number(value) || 0), 'Tồn kho']} />
              <Line
                type="monotone"
                dataKey="Tồn kho (kg)"
                stroke="var(--primary-500)"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Lịch sử nhập / xuất biến động kho</h3>

        <DataState loading={loading} error={error} isEmpty={historyEvents.length === 0}>
          <div className="space-y-2">
            {historyEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center"
              >
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{evt.note}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{formatNgay(evt.date)}</p>
                </div>
                <span
                  className={`font-mono font-bold text-xs ${evt.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {evt.type === 'in' ? '+' : ''}
                  {formatKg(evt.amount)}
                </span>
              </div>
            ))}
          </div>
        </DataState>
      </div>

      {/* Stock counts history */}
      {stockCounts.length > 0 && (
        <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Lịch sử kiểm kê kho</h3>
          <div className="space-y-2">
            {stockCounts.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {formatNgay(c.date)} — {c.counted_bags} bao thực tế
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Đếm: {formatKg(c.counted_kg)} · Hệ thống: {formatKg(c.system_kg)}
                  </p>
                  {c.notes && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.notes}</p>}
                </div>
                <span
                  className={`font-mono font-bold text-xs shrink-0 ${c.diff_kg === 0 ? 'text-[var(--text-muted)]' : c.diff_kg > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {c.diff_kg > 0 ? '+' : ''}
                  {formatKg(c.diff_kg)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock count modal */}
      <Modal isOpen={isCountModalOpen} onClose={() => setIsCountModalOpen(false)} title="Kiểm kê kho thực tế">
        <form onSubmit={handleSaveCount} className="space-y-4">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">Tồn kho theo hệ thống:</span>
            <span className="font-mono font-black text-sm text-[var(--primary-500)]">
              {formatKg(inventoryStats.currentStockKg)}
            </span>
          </div>

          <FormField label="Số bao đếm được thực tế" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              className="input-field font-mono font-bold"
              value={countedBags || ''}
              onChange={(e) => setCountedBags(Number(e.target.value))}
            />
          </FormField>

          <FormField label="Khối lượng đếm được thực tế (kg)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              step="any"
              className="input-field font-mono font-bold"
              value={countedKg || ''}
              onChange={(e) => setCountedKg(Number(e.target.value))}
            />
          </FormField>

          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">Chênh lệch:</span>
            <span
              className={`font-mono font-black text-sm ${countedKg - inventoryStats.currentStockKg === 0 ? 'text-[var(--text-muted)]' : countedKg - inventoryStats.currentStockKg > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {formatKg(countedKg - inventoryStats.currentStockKg)}
            </span>
          </div>

          <FormField label="Ghi chú">
            <textarea
              className="input-field"
              rows={2}
              placeholder="Lý do chênh lệch (nếu có)..."
              value={countNotes}
              onChange={(e) => setCountNotes(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setIsCountModalOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={savingCount} className="btn-primary disabled:opacity-60">
              {savingCount ? 'Đang lưu...' : 'Lưu kết quả kiểm kê'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
