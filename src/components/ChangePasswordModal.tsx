import { useState } from 'react';
import { Modal, FormField } from './Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal isOpen onClose={onClose} title="Đổi mật khẩu">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving || !user) return;
          if (next !== confirmation) {
            toast.warning('Hai lần nhập mật khẩu mới chưa khớp.');
            return;
          }
          setSaving(true);
          try {
            const { error: authError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: current,
            });
            if (authError) throw new Error('Mật khẩu hiện tại không đúng.');
            const { error } = await supabase.auth.updateUser({ password: next });
            if (error) throw error;
            toast.success('Đã đổi mật khẩu.');
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Không đổi được mật khẩu.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <FormField label="Mật khẩu hiện tại" required>
          <input
            className="input-field"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </FormField>
        <FormField label="Mật khẩu mới" required>
          <input
            className="input-field"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </FormField>
        <FormField label="Nhập lại mật khẩu mới" required>
          <input
            className="input-field"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </FormField>
        <p className="text-xs text-[var(--text-muted)]">Mật khẩu mới tối thiểu 6 ký tự.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
