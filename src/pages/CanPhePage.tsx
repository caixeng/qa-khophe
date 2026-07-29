import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, Calculator, History } from 'lucide-react';
import { formatKg, formatNgay } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { NumPad } from '../components/NumPad';
import { useAsyncData } from '../hooks/useAsyncData';
import { weighingService } from '../services/weighingService';

const MOCK_BAGS = [907, 933, 827, 902, 956, 1004, 911, 932, 771, 1000, 868, 824, 858, 871, 843, 801, 945, 984, 991, 765, 907, 843, 889, 807, 903];

export const CanPhePage: React.FC = () => {
  const { data: sessionsData, refetch } = useAsyncData(weighingService.getSessions, []);
  const sessions = sessionsData || [];

  const [activeBags, setActiveBags] = useState<number[]>(MOCK_BAGS);
  const [isNumPadOpen, setIsNumPadOpen] = useState(false);

  const totalWeight = useMemo(() => {
    return activeBags.reduce((a, b) => a + b, 0);
  }, [activeBags]);

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
            material_type: 'Tấm nhựa nano',
            total_bags: activeBags.length,
            total_weight_kg: totalWeight,
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
        subtitle="Giao diện nhập liệu cân phế theo từng bao, hỗ trợ phím số NumPad"
        action={{ label: 'Phiên cân mới', icon: Plus, onClick: handleNewSession }} 
      />

      {/* Active Weighing Session Header */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border-color)] pb-4 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                Phiên cân đang mở
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">{formatNgay(new Date().toISOString())}</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">Lô phế bột nhựa nano</h2>
          </div>

          <button
            onClick={() => setIsNumPadOpen(true)}
            className="btn-primary flex items-center space-x-2 shadow-md w-full sm:w-auto justify-center"
          >
            <Calculator size={18} />
            <span>Mở bàn phím cân bao mới</span>
          </button>
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Tổng số bao</p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">{activeBags.length} bao</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Tổng khối lượng</p>
            <p className="text-2xl font-mono font-black text-[var(--primary-500)] mt-1">{formatKg(totalWeight)}</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] col-span-2 sm:col-span-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Khối lượng TB/bao</p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">
              {activeBags.length > 0 ? `${(totalWeight / activeBags.length).toFixed(1)} kg` : '0 kg'}
            </p>
          </div>
        </div>

        {/* Bag Chips Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Danh sách bao phế đã cân ({activeBags.length})
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
                  {formatKg(s.total_weight_kg || s.total_kg || 0)}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Hôm nay, 08:30</p>
                  <p className="text-[10px] text-[var(--text-muted)]">25 bao • Tấm nhựa nano</p>
                </div>
                <span className="font-mono font-bold text-xs text-[var(--primary-500)]">22.242 kg</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* NumPad Modal */}
      <Modal isOpen={isNumPadOpen} onClose={() => setIsNumPadOpen(false)} title="Nhập khối lượng bao phế">
        <NumPad onSubmit={handleAddBag} />
      </Modal>
    </div>
  );
};
