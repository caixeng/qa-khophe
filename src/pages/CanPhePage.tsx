import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Calculator, History, Box, Printer, Paperclip, Save, X, Trash2, Users } from 'lucide-react';
import { cn, formatKg, formatNgay } from '../lib/utils';
import { Modal } from '../components/Modal';
import { NumPad } from '../components/NumPad';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataState } from '../components/DataState';
import { AttachmentUploader } from '../components/AttachmentUploader';
import { useAsyncList } from '../hooks/useAsyncData';
import { useToast } from '../contexts/toast';
import { useAuth } from '../contexts/auth';
import { weighingService } from '../services/weighingService';
import { contactsService } from '../services/contactsService';
import { PALLET_TYPES, type PalletType } from '../lib/palletUtils';
import { printPhieuCan } from '../lib/print';

interface CanPhePageProps {
  actionRef?: React.MutableRefObject<(() => void) | null>;
}

const DRAFT_KEY = 'khophe_can_phe_draft_v1';

interface Draft {
  bags: number[];
  pallet: PalletType;
  palletQty: number;
  contactId?: string;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.bags) || parsed.bags.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ ẩn danh) — không chặn việc cân,
    // chỉ mất khả năng khôi phục nếu app bị tắt/mất mạng giữa chừng.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Không sao — draft cũ nằm đó cũng không gây hại gì, lần sau ghi đè lại.
  }
}

export const CanPhePage: React.FC<CanPhePageProps> = ({ actionRef }) => {
  const { data: sessions, loading, error, refetch } = useAsyncList(weighingService.getSessions, []);
  const { data: contacts } = useAsyncList(contactsService.getAll, []);
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === 'manager' || user?.role === 'admin';

  const initialDraft = useMemo(() => loadDraft(), []);
  const restoredOnMount = useRef(!!initialDraft);

  const [activeBags, setActiveBags] = useState<number[]>(initialDraft?.bags ?? []);
  const [isNumPadOpen, setIsNumPadOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmNewSession, setConfirmNewSession] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<PalletType>(initialDraft?.pallet ?? 'none');
  const [palletQty, setPalletQty] = useState<number>(initialDraft?.palletQty ?? 1);
  const [contactId, setContactId] = useState<string>(initialDraft?.contactId ?? '');
  const [printingSessionId, setPrintingSessionId] = useState<string | null>(null);
  const [attachSessionId, setAttachSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Báo cho người dùng biết đã khôi phục phiên cân đang dở, chỉ 1 lần lúc mở trang.
  useEffect(() => {
    if (restoredOnMount.current) {
      toast.success(`Đã khôi phục phiên cân đang dở (${initialDraft?.bags.length} bao)`);
      restoredOnMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự lưu tạm sau MỖI thay đổi — khoá màn hình, hết pin, hay lỡ tay đóng tab
  // giữa chừng cũng không mất số đã cân tay ngoài xưởng.
  useEffect(() => {
    if (activeBags.length > 0) {
      saveDraft({ bags: activeBags, pallet: selectedPallet, palletQty, contactId: contactId || undefined });
    } else {
      clearDraft();
    }
  }, [activeBags, selectedPallet, palletQty, contactId]);

  const grossWeight = useMemo(() => activeBags.reduce((a, b) => a + b, 0), [activeBags]);
  const tareWeight = useMemo(
    () => PALLET_TYPES[selectedPallet].weightKg * palletQty,
    [selectedPallet, palletQty],
  );
  const netWeight = Math.max(0, grossWeight - tareWeight);

  const openAddBag = () => {
    setEditingIndex(null);
    setIsNumPadOpen(true);
  };

  const openEditBag = (idx: number) => {
    setEditingIndex(idx);
    setIsNumPadOpen(true);
  };

  const handleNumPadSubmit = (val: string) => {
    const weight = parseFloat(val);
    if (!isNaN(weight) && weight > 0) {
      if (editingIndex !== null) {
        setActiveBags((prev) => prev.map((w, i) => (i === editingIndex ? weight : w)));
      } else {
        setActiveBags((prev) => [weight, ...prev]);
      }
    }
    setEditingIndex(null);
    setIsNumPadOpen(false);
  };

  const handleRemoveBag = (idx: number) => {
    setActiveBags((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCurrentSession = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await weighingService.createSessionWithBags(
        {
          material_type: `Cân phế ${PALLET_TYPES[selectedPallet].name}`,
          total_bags: activeBags.length,
          total_kg: netWeight,
          contact_id: contactId || undefined,
        },
        activeBags.map((w, idx) => ({ bag_number: activeBags.length - idx, weight_kg: w })),
      );
      toast.success('Đã lưu phiên cân');
      clearDraft();
      refetch();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu phiên cân');
      console.error('Lỗi khi lưu phiên cân:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = async () => {
    const ok = await saveCurrentSession();
    if (ok) {
      setActiveBags([]);
      setSelectedPallet('none');
      setPalletQty(1);
      setContactId('');
    }
  };

  /**
   * Bắt đầu phiên cân mới. Nếu đang có bao chưa lưu thì hỏi trước — dùng
   * ConfirmDialog thay vì confirm() gốc của trình duyệt, vì hộp thoại gốc bị
   * chặn trong PWA standalone trên một số máy Android, và khi bị chặn nó trả
   * về false lặng lẽ: người dùng bấm "phiên mới" và mất sạch số bao vừa cân
   * mà không hề thấy câu hỏi nào.
   */
  const handleNewSession = () => {
    if (activeBags.length > 0) {
      setConfirmNewSession(true);
      return;
    }
    setActiveBags([]);
  };

  if (actionRef) {
    actionRef.current = handleNewSession;
  }

  const handlePrintSession = async (session: (typeof sessions)[number]) => {
    setPrintingSessionId(session.id);
    try {
      const bags = await weighingService.getSessionBags(session.id);
      printPhieuCan(session, bags);
    } catch (err) {
      toast.error('Lỗi khi tải chi tiết phiên cân để in');
      console.error('Lỗi khi tải chi tiết phiên cân để in:', err);
    } finally {
      setPrintingSessionId(null);
    }
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      await weighingService.deleteSession(deleteSessionId);
      toast.success('Đã xoá phiên cân');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xoá phiên cân');
      console.error(err);
    }
    setDeleteSessionId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Active Weighing Session Header */}
      <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border-color)] pb-4 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                {activeBags.length > 0 ? 'Phiên cân đang mở' : 'Chưa có phiên cân nào đang mở'}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {formatNgay(new Date().toISOString())}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {activeBags.length > 0
                ? `Đang cân (${activeBags.length} bao)`
                : 'Bấm "Mở NumPad" để bắt đầu cân bao mới'}
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeBags.length > 0 && (
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="btn-primary flex items-center space-x-2 shadow-md flex-1 sm:flex-none justify-center cursor-pointer disabled:opacity-60"
              >
                <Save size={18} />
                <span>{saving ? 'Đang lưu...' : 'Lưu phiên cân'}</span>
              </button>
            )}
            <button
              onClick={openAddBag}
              className={cn(
                'flex items-center space-x-2 shadow-md flex-1 sm:flex-none justify-center cursor-pointer',
                activeBags.length > 0 ? 'btn-secondary' : 'btn-primary',
              )}
            >
              <Calculator size={18} />
              <span>Mở NumPad cân bao mới</span>
            </button>
          </div>
        </div>

        {/* PALLET SELECTION BAR */}
        <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Box size={16} className="text-[var(--primary-500)]" /> Quy định Trừ Bì Ba Lết (Pallet)
            </span>
            <span className="text-xs font-mono font-bold text-rose-600">
              {tareWeight > 0
                ? `Trừ bì: -${tareWeight} kg (${PALLET_TYPES[selectedPallet].name})`
                : 'Không trừ lết'}
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
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[var(--primary-50)] border-[var(--primary-500)] text-[var(--primary-600)] font-bold shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
                  )}
                >
                  <p className="text-xs font-bold">{cfg.name}</p>
                  <p className="text-[11px] font-mono opacity-80">
                    {cfg.weightKg > 0 ? `-${cfg.weightKg} kg/lết (${cfg.symbol})` : '0 kg'}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedPallet !== 'none' && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Số lượng lết dùng:</span>
              <input
                type="number"
                inputMode="decimal"
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

        {/* ĐỐI TÁC GẮN VỚI PHIÊN CÂN — để đối chiếu được với phiếu nhập/xuất sau này */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 shrink-0">
            <Users size={14} className="text-[var(--primary-500)]" /> Đối tác (tuỳ chọn):
          </span>
          <select
            className="input-field flex-1 text-xs py-1.5"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">-- Cân vãng lai, chưa rõ đối tác --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.type === 'supplier' ? '(NCC)' : c.type === 'customer' ? '(Khách)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Real-time Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Tổng số bao
            </p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">
              {activeBags.length} bao
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Tổng cân thô (Gross)
            </p>
            <p className="text-2xl font-mono font-black text-[var(--text-primary)] mt-1">
              {formatKg(grossWeight)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Trừ bì lết (Tare)
            </p>
            <p className="text-2xl font-mono font-black text-rose-600 mt-1">-{tareWeight} kg</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Thực phế (Net)
            </p>
            <p className="text-2xl font-mono font-black text-emerald-600 mt-1">{formatKg(netWeight)}</p>
          </div>
        </div>

        {/* Bag Chips Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center">
            <span>Danh sách bao đã cân ({activeBags.length} bao) — bấm để sửa</span>
            <span className="font-mono text-emerald-600 font-bold">
              TB: {(netWeight / (activeBags.length || 1)).toFixed(1)} kg/bao
            </span>
          </h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {activeBags.map((w, idx) => (
              <span
                key={idx}
                className="group relative px-3 py-1.5 pr-6 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs font-mono font-bold text-[var(--text-primary)] shadow-xs flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => openEditBag(idx)}
                  className="cursor-pointer"
                  title="Sửa số cân bao này"
                >
                  #{activeBags.length - idx}: <span className="text-[var(--primary-500)]">{w} kg</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveBag(idx)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 cursor-pointer"
                  title="Xoá bao này"
                >
                  <X size={10} />
                </button>
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

        <DataState
          loading={loading}
          error={error}
          isEmpty={sessions.length === 0}
          emptyTitle="Chưa có phiên cân nào"
        >
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {formatNgay(s.date)} - {s.material_type}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {s.total_bags} bao{s.contact_name ? ` · ${s.contact_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-xs text-[var(--primary-500)]">
                    {formatKg(s.total_kg || 0)}
                  </span>
                  <button
                    onClick={() => setAttachSessionId(s.id)}
                    className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary-500)] transition-colors cursor-pointer"
                    title="Đính kèm ảnh phiếu cân"
                  >
                    <Paperclip size={15} />
                  </button>
                  <button
                    onClick={() => handlePrintSession(s)}
                    disabled={printingSessionId === s.id}
                    className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary-500)] transition-colors cursor-pointer disabled:opacity-50"
                    title="In phiếu cân"
                  >
                    <Printer size={15} />
                  </button>
                  {canManage && (
                    <button
                      onClick={() => setDeleteSessionId(s.id)}
                      className="icon-action text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Xoá phiên cân"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </div>

      {/* NumPad Modal */}
      <Modal
        isOpen={isNumPadOpen}
        onClose={() => {
          setIsNumPadOpen(false);
          setEditingIndex(null);
        }}
        title={editingIndex !== null ? 'Sửa khối lượng bao phế' : 'Nhập khối lượng bao phế mới'}
      >
        <NumPad
          key={editingIndex ?? 'new'}
          defaultValue={editingIndex !== null ? String(activeBags[editingIndex]) : undefined}
          onSubmit={handleNumPadSubmit}
        />
      </Modal>
      <ConfirmDialog
        isOpen={confirmNewSession}
        onClose={() => setConfirmNewSession(false)}
        onConfirm={async () => {
          const ok = await saveCurrentSession();
          setConfirmNewSession(false);
          // Chỉ xoá danh sách bao khi đã lưu thành công — lưu hỏng mà vẫn xoá
          // là mất trắng số liệu vừa cân tay.
          if (ok) setActiveBags([]);
        }}
        title="Lưu phiên cân hiện tại?"
        message={`Đang có ${activeBags.length} bao chưa lưu. Lưu lại trước khi bắt đầu phiên cân mới?`}
        confirmText="Lưu và tạo phiên mới"
        cancelText="Quay lại"
      />

      <Modal
        isOpen={!!attachSessionId}
        onClose={() => setAttachSessionId(null)}
        title="Ảnh đính kèm phiên cân"
      >
        {attachSessionId && <AttachmentUploader refType="weighing_session" refId={attachSessionId} />}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={confirmDeleteSession}
        title="Xoá phiên cân"
        message="Bạn có chắc chắn muốn xoá phiên cân này cùng toàn bộ chi tiết bao? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
