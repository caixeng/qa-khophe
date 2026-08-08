import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Loader2, ImageOff } from 'lucide-react';
import { attachmentsService, type Attachment, type AttachmentRefType } from '../services/attachmentsService';
import { useToast } from '../contexts/toast';
import { useAuth } from '../contexts/auth';
import { ConfirmDialog } from './ConfirmDialog';

interface AttachmentUploaderProps {
  refType: AttachmentRefType;
  refId: string;
  label?: string;
}

/**
 * Ảnh hoá đơn / phiếu cân giấy / chụp màn hình chuyển khoản, gắn theo phiếu.
 * Dùng chung cho phiếu nhập, phiếu xuất, chi phí, ứng tiền, phiên cân — chỉ
 * cần render sau khi phiếu đã có `refId` thật (đã lưu), vì ảnh gắn theo ID.
 *
 * `capture="environment"` mở thẳng camera sau trên điện thoại thay vì chỉ mở
 * trình duyệt file — quan trọng ở xưởng vì phần lớn ảnh là chụp tại chỗ, không
 * phải chọn từ ảnh có sẵn.
 */
export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  refType,
  refId,
  label = 'Ảnh hoá đơn / chuyển khoản',
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const canDelete = user?.role === 'manager' || user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [preview, setPreview] = useState<Attachment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attachmentsService.getByRef(refType, refId);
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tải ảnh đính kèm');
    } finally {
      setLoading(false);
    }
  }, [refType, refId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho chọn lại đúng file đó ở lần sau nếu cần
    if (!file) return;

    setUploading(true);
    try {
      await attachmentsService.upload(file, refType, refId);
      toast.success('Đã tải ảnh lên');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      await attachmentsService.remove(target);
      toast.success('Đã xoá ảnh');
      setItems((prev) => prev.filter((x) => x.id !== target.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xoá ảnh');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shrink-0"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          {uploading ? 'Đang tải lên...' : 'Chụp / Chọn ảnh'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {loading ? (
        <div className="text-[11px] text-[var(--text-muted)]">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
          <ImageOff size={13} /> Chưa có ảnh đính kèm
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((a) => (
            <div key={a.id} className="relative group">
              <button
                type="button"
                onClick={() => setPreview(a)}
                className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)] cursor-pointer block"
                title="Xem ảnh"
              >
                <img
                  src={a.url}
                  alt={a.file_name || 'Ảnh đính kèm'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(a)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm cursor-pointer"
                  title="Xoá ảnh"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview.url}
            alt={preview.file_name || 'Ảnh đính kèm'}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Xoá ảnh đính kèm"
        message="Bạn có chắc chắn muốn xoá ảnh này? Hành động này không thể hoàn tác."
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
