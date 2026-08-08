import * as React from 'react';
import { useState, useMemo } from 'react';
import { Package, TrendingUp, TrendingDown, ClipboardCheck, Trash2, Settings2, Check } from 'lucide-react';
import { formatKg, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { DataState } from '../components/DataState';
import { Modal, FormField } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  const canEditOpeningStock = user?.role === 'admin';

  const { data: grinding, loading: gLoading, error: gError } = useAsyncList(grindingService.getAll, []);
  const { data: exports, loading: eLoading, error: eError } = useAsyncList(exportsService.getAll, []);
  const { data: kgPerBagData } = useAsyncData(settingsService.getKgPerBag, []);
  const {
    data: openingStockData,
    refetch: refetchOpeningStock,
  } = useAsyncData(settingsService.getOpeningStock, []);
  const { data: stockCounts, refetch: refetchStockCounts } = useAsyncList(stockCountService.getAll, []);

  const kgPerBag = kgPerBagData ?? 900;
  const openingStock = openingStockData ?? 0;

  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [openingStockStr, setOpeningStockStr] = useState('');
  const [savingOpeningStock, setSavingOpeningStock] = useState(false);

  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  // Lưu dạng chuỗi thay vì number — nếu ép Number() ngay từ đầu, `value={n || ''}` sẽ
  // biến 0 thành rỗng, khiến ô "bắt buộc" không cho lưu khi đếm được đúng 0 bao.
  const [countedBagsStr, setCountedBagsStr] = useState('');
  const [countedKgStr, setCountedKgStr] = useState('');
  const countedBags = Number(countedBagsStr) || 0;
  const countedKg = Number(countedKgStr) || 0;
  const [countNotes, setCountNotes] = useState('');
  const [savingCount, setSavingCount] = useState(false);
  const [deleteCountId, setDeleteCountId] = useState<string | null>(null);

  const inventoryStats = useMemo(() => {
    const totalGround = grinding.reduce((sum, g) => sum + (Number(g.output_qty_kg) || 0), 0);
    const totalExported = exports.reduce((sum, e) => sum + (Number(e.total_kg) || 0), 0);
    const { currentStockKg, currentBags } = computeInventory(totalGround, totalExported, kgPerBag, openingStock);

    return {
      totalGround,
      totalExported,
      currentStockKg,
      currentBags,
    };
  }, [grinding, exports, kgPerBag, openingStock]);

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

    let running = openingStock;
    const byDate = new Map<string, number>();
    for (const m of movements) {
      running += m.delta;
      byDate.set(m.date, running);
    }

    return Array.from(byDate.entries()).map(([date, stockKg]) => ({
      date: formatNgay(date),
      'Tồn kho (kg)': Math.max(0, stockKg),
    }));
  }, [grinding, exports, openingStock]);

  const loading = gLoading || eLoading;
  const error = gError || eError;

  const openCountModal = () => {
    setCountedBagsStr(String(inventoryStats.currentBags));
    setCountedKgStr(String(inventoryStats.currentStockKg));
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

  const confirmDeleteCount = async () => {
    if (!deleteCountId) return;
    try {
      await stockCountService.delete(deleteCountId);
      toast.success('Đã xoá bản ghi kiểm kê');
      refetchStockCounts();
    } catch (err) {
      toast.error('Lỗi khi xoá bản ghi kiểm kê');
      console.error(err);
    }
    setDeleteCountId(null);
  };

  const openOpeningStockModal = () => {
    setOpeningStockStr(String(openingStock));
    setIsOpeningStockModalOpen(true);
  };

  const handleSaveOpeningStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOpeningStock(true);
    try {
      await settingsService.setOpeningStock(Number(openingStockStr) || 0);
      toast.success('Đã cập nhật tồn kho đầu kỳ');
      setIsOpeningStockModalOpen(false);
      refetchOpeningStock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu tồn kho đầu kỳ');
      console.error(err);
    } finally {
      setSavingOpeningStock(false);
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

      {/* Tồn kho đầu kỳ — bù cho phần tồn kho có sẵn trước khi dùng app */}
      <div className="card p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[var(--text-primary)]">
            Tồn kho đầu kỳ: <span className="font-mono text-[var(--primary-500)]">{formatKg(openingStock)}</span>
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Số kg đã có sẵn trong kho trước khi bắt đầu ghi nhận phiếu xay/xuất trên hệ thống — cộng vào tồn
            kho hiện tại ở trên.
          </p>
        </div>
        {canEditOpeningStock && (
          <button
            onClick={openOpeningStockModal}
            className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3 shrink-0 cursor-pointer"
          >
            <Settings2 size={14} />
            Cấu hình
          </button>
        )}
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
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono font-bold text-xs ${c.diff_kg === 0 ? 'text-[var(--text-muted)]' : c.diff_kg > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {c.diff_kg > 0 ? '+' : ''}
                    {formatKg(c.diff_kg)}
                  </span>
                  {canCount && (
                    <button
                      onClick={() => setDeleteCountId(c.id)}
                      className="icon-action text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Xoá bản ghi kiểm kê"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
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
              value={countedBagsStr}
              onChange={(e) => setCountedBagsStr(e.target.value)}
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
              value={countedKgStr}
              onChange={(e) => setCountedKgStr(e.target.value)}
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

      <ConfirmDialog
        isOpen={!!deleteCountId}
        onClose={() => setDeleteCountId(null)}
        onConfirm={confirmDeleteCount}
        title="Xoá bản ghi kiểm kê"
        message="Bạn có chắc chắn muốn xoá bản ghi kiểm kê này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />

      {/* Opening stock config modal */}
      <Modal
        isOpen={isOpeningStockModalOpen}
        onClose={() => setIsOpeningStockModalOpen(false)}
        title="Cấu hình tồn kho đầu kỳ"
      >
        <form onSubmit={handleSaveOpeningStock} className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Nhập số kg thành phẩm đã có sẵn trong kho <b>trước khi</b> bắt đầu ghi nhận phiếu xay/xuất trên hệ
            thống. Giá trị này được cộng vào mọi tính toán tồn kho — chỉ cần nhập đúng 1 lần khi mới dùng
            app; nếu xưởng đã dùng app từ đầu thì để 0.
          </p>

          <FormField label="Tồn kho đầu kỳ (kg)" required>
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              step="any"
              className="input-field font-mono font-bold"
              value={openingStockStr}
              onChange={(e) => setOpeningStockStr(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setIsOpeningStockModalOpen(false)} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingOpeningStock}
              className="btn-primary disabled:opacity-60 flex items-center gap-1.5"
            >
              {savingOpeningStock ? (
                'Đang lưu...'
              ) : (
                <>
                  <Check size={15} /> Lưu
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
