import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Modal, FormField } from './Modal';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { formatRole } from '../lib/utils';

export function EditProfileModal({
  onClose,
  onOpenChangePassword,
}: {
  onClose: () => void;
  onOpenChangePassword?: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const usernameDisplay = user.email.endsWith('@accounts.khophe.local')
    ? user.email.split('@')[0]
    : user.email;

  return (
    <Modal isOpen onClose={onClose} title="Chỉnh sửa thông tin cá nhân">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          const cleanName = name.trim();
          if (!cleanName) {
            toast.warning('Vui lòng nhập họ và tên hiển thị.');
            return;
          }
          setSaving(true);
          try {
            const { error } = await updateProfile({
              name: cleanName,
              phone: phone.trim(),
            });
            if (error) {
              toast.error(error);
              return;
            }
            toast.success('Đã cập nhật thông tin cá nhân.');
            onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        {/* Thẻ tóm tắt tài khoản */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white text-lg font-black shadow-sm shrink-0">
            {(name.trim() || user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
              {name.trim() || user.name || 'Người dùng'}
            </p>
            <p className="text-xs font-mono text-[var(--text-muted)] truncate">{usernameDisplay}</p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-500)]/20">
              <ShieldCheck size={11} />
              {formatRole(user.role)}
            </span>
          </div>
        </div>

        <FormField label="Tên đăng nhập / Email hệ thống">
          <input className="input-field font-mono opacity-70" type="text" disabled value={usernameDisplay} />
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Tên đăng nhập cố định theo tài khoản để đảm bảo định danh lịch sử thao tác.
          </p>
        </FormField>

        <FormField label="Họ và tên hiển thị" required>
          <input
            className="input-field"
            type="text"
            required
            placeholder="Nhập họ và tên của bạn..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField label="Số điện thoại liên hệ">
          <input
            className="input-field font-mono"
            type="tel"
            placeholder="Ví dụ: 0901234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
          {onOpenChangePassword ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChangePassword();
              }}
              className="text-xs font-bold text-[var(--primary-600)] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={13} />
              <span>Đổi mật khẩu đăng nhập</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button type="button" className="btn-secondary cursor-pointer" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary cursor-pointer" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
