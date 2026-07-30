import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, Calculator, History, Box } from 'lucide-react';
import { cn, formatKg } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { NumPad } from '../components/NumPad';
import { useAsyncData } from '../hooks/useAsyncData';
import { weighingService } from '../services/weighingService';
import { PALLET_TYPES, type PalletType } from '../lib/palletUtils';

// 29/07/2026 CÂN PHẾ NAM Dataset (24 bao)
const NAM_BAGS_2907 = [844, 722, 990, 734, 885, 894, 829, 752, 1010, 835, 951, 871, 1015, 1009, 900, 836, 706, 870, 904, 827, 883, 875, 899, 903];

export const CanPhePage: React.FC = () => {
  const { data: sessionsData, refetch } = useAsyncData(weighingService.getSessions, []);
  const sessions = sessionsData || [];

  const [activeBags, setActiveBags] = useState<number[]>(NAM_BAGS_2907);
  const [isNumPadOpen, setIsNumPadOpen] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<PalletType>('none');
  const [palletQty, setPalletQty] = useState<number>(1);

  const grossWeight = useMemo(() => {
    return activeBags.reduce((a, b) => a + b, 0);
  }, [activeBags]);

  const tareWeight = useMemo(() => {
    return PALLET_TYPES[selectedPallet].weightKg * palletQty;
  }, [selectedPallet, palletQty]);

  const netWeight = Math.max(0, grossWeight - tareWeight);

  const handleAddBag = (val: string) => {
    const weight = parseFloat(val);
    if (!isNaN(weight) && weight > 0) {
      setActiveBags([weight, ...activeBags]);
    }
    setIsNumPadOpen(false);
  };

  const handleNewSession = async () => {
    if (activeBags.length > 0) {
      if (confirm('Lưu phiên cân hiện tại trước khi tạo phiên mới?')) {
        try {
          const newSession = await weighingService.createSession({
            date: new Date().toISOString().split('T')[0],
            material_type: `Cân phế ${PALLET_TYPES[selectedPallet].name}`,
            total_bags: activeBags.length,
            total_kg: netWeight,
          });

          for (let i = 0; i < activeBags.length; i++) {
            await weighingService.addBag(newSession.id, activeBags.length - i, activeBags[i]);
          }
          refetch();
        } catch (err) {
          console.error('Lỗi khi lưu phiên cân:', err);
        }
      }
    }
    setActiveBags([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <PageHeader 
        title="Cân Phế" 
        subtitle="Quản lý cân phế từng bao, hỗ trợ trừ bì Ba Lết (Sắt 41kg, Gỗ 27kg, Nhựa 20kg, Lồng 81kg)"
        action={{ label: 'Phiên cân mới', icon: Plus, onClick: handleNewSession }} 
      />

      {/* Active Weighing Session Header */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border-color)] pb-4 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                Phiên cân 29/07/2026 đang mở
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">CÂN PHẾ NAM</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">Phế liệu nhựa Nam (24 bao)</h2>
          </div>

          <button
            onClick={() => setIsNumPadOpen(true)}
            className="btn-primary flex items-center space-x-2 shadow-md w-full sm:w-auto justify-center cursor-pointer"
          >
            <Calculator size={18} />
            <span>Mở NumPad cân bao mới</span>
          </button>
        </div>

        {/* PALLET SELECTION BAR */}
        <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Box size={16} className="text-[var(--primary-500)]" /> Quy định Trừ Bì Ba Lết (Pallet)
            </span>
            <span className="text-xs font-mono font-bold text-rose-600">
              {tareWeight > 0 ? `Trừ bì: -${tareWeight} kg (${PALLET_TYPES[selectedPallet].name})` : 'Không trừ lết'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(PALLET_TYPES) as PalletType[]).map((pType) => {
              const cfg = PALLET_TYPES[pType];
              const isSelected = selectedPallet === pType;
              return (
                <button
                  key={pType}
                  onClick={() => setSelectedPallet(pType)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--primary-50)] border-[var(--primary-500)] text-[var(--primary-600)] font-bold shadow-xs"
                      : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  )}
                >
                  <p className="text-xs font-bold">{cfg.name}</p>
                  <p className="text-[10px] font-mono opacity-80">{cfg.weightKg > 0 ? `-${cfg.weightKg} kg/lết (${cfg.symbol})` : '0 kg'}</p>
                </button>
              );
            })}
          </div>

          {selectedPallet !== 'none' && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Số lượng lết dùng:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={palletQty}
                onChange={(e) => setPalletQty(Math.max(1, Number(e.target.value)))}
                className="input-field w-20 text-center font-mono font-bold py-1"
              />
              <span className="text-xs font-mono font-bold text-[var(--primary-500)]">
                = {tareWeight} kg bì
              </span>
            </div>
          )}
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Tổng số bao</p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">{activeBags.length} bao</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Tổng cân thô (Gross)</p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">{formatKg(grossWeight)}</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Trừ bì lết (Tare)</p>
            <p className="text-2xl font-mono font-black text-rose-600 mt-1">-{tareWeight} kg</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Thực phế (Net)</p>
            <p className="text-2xl font-mono font-black text-emerald-600 mt-1">{formatKg(netWeight)}</p>
          </div>
        </div>

        {/* Bag Chips Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center">
            <span>Danh sách bao phế 29/07 đã cân ({activeBags.length} bao)</span>
            <span className="font-mono text-emerald-600 font-bold">TB: {(netWeight / (activeBags.length || 1)).toFixed(1)} kg/bao</span>
          </h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {activeBags.map((w, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-mono font-bold text-[var(--text-primary)] shadow-xs"
              >
                #{activeBags.length - idx}: <span className="text-[var(--primary-500)]">{w} kg</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions History List */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
          <History size={18} className="text-[var(--primary-500)]" />
          <span>Lịch sử các phiên cân phế</span>
        </h3>

        <div className="space-y-2">
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{s.date} - {s.material_type}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{s.total_bags} bao</p>
                </div>
                <span className="font-mono font-bold text-xs text-[var(--primary-500)]">
                  {formatKg(s.total_kg || (s as any).total_weight_kg || 0)}
                </span>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">29/07/2026 - Cân Phế Nam (không lết)</p>
                <p className="text-[10px] text-[var(--text-muted)]">24 bao • Tấm nhựa nano</p>
              </div>
              <span className="font-mono font-bold text-xs text-emerald-600">20.947 kg</span>
            </div>
          )}
        </div>
      </div>

      {/* NumPad Modal */}
      <Modal isOpen={isNumPadOpen} onClose={() => setIsNumPadOpen(false)} title="Nhập khối lượng bao phế mới">
        <NumPad onSubmit={handleAddBag} />
      </Modal>
    </div>
  );
};
