import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, Weight, Calculator, History, PackageOpen, Layers } from 'lucide-react';
import { cn, formatKg, formatNgay } from '../lib/utils';
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Session Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-4 border-b border-[var(--border-color)]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-500)]/20 mb-2 inline-block">
                  Đang cân live
                </span>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Phiên cân phế nhựa</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatNgay(new Date().toISOString())} • Tấm nhựa nano</p>
              </div>
              <div className="text-left sm:text-right bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-color)] min-w-[180px]">
                <div className="text-3xl font-black font-mono text-[var(--primary-500)]">{formatKg(totalWeight)}</div>
                <div className="text-xs font-bold text-[var(--text-muted)] mt-0.5">{activeBags.length} bao thành phẩm</div>
              </div>
            </div>

            {/* List of Weighed Bags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6 max-h-[360px] overflow-y-auto p-1">
              {activeBags.map((weight, idx) => (
                <div key={idx} className="bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl p-3 flex justify-between items-center shadow-xs transition-transform hover:scale-105">
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">#{activeBags.length - idx}</span>
                  <span className="font-mono font-black text-sm text-[var(--text-primary)]">{weight} kg</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsNumPadOpen(true)}
              className="btn-primary w-full py-3.5 text-base font-bold flex justify-center items-center gap-2 cursor-pointer shadow-md"
            >
              <Calculator size={20} />
              <span>Cân bao mới (Bấm số)</span>
            </button>
          </div>
        </div>

        {/* Recent Session History */}
        <div className="space-y-4">
          <div className="card p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <History size={18} className="text-[var(--primary-500)]" />
              Lịch sử phiên cân
            </h3>
            
            <div className="space-y-3">
              {sessions.length > 0 ? (
                sessions.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{s.date} - {s.material_type}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{s.total_bags} bao</p>
                    </div>
                    <span className="font-mono font-bold text-xs text-[var(--primary-500)]">
                      {formatKg(s.total_weight_kg)}
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
                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Hôm qua, 14:15</p>
                      <p className="text-[10px] text-[var(--text-muted)]">20 bao • Tấm nhựa nano</p>
                    </div>
                    <span className="font-mono font-bold text-xs text-[var(--primary-500)]">18.500 kg</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NumPad Modal */}
      <Modal isOpen={isNumPadOpen} onClose={() => setIsNumPadOpen(false)} title="Nhập khối lượng bao (kg)">
        <NumPad 
          value="" 
          onChange={() => {}} 
          onSubmit={handleAddBag} 
        />
      </Modal>
    </div>
  );
};
