import { useState } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Pencil,
  Lock,
  Unlock,
  RefreshCw,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usersService, type ManagedUser } from '../services/usersService';
import { useAsyncList } from '../hooks/useAsyncData';
import { DataState } from './DataState';
import { Modal, FormField } from './Modal';
import { PermissionMatrixPanel } from './PermissionMatrixPanel';
import { PERMISSION_GROUPS, type PermissionKey } from '../lib/permissions';
import { useAuth } from '../contexts/auth';
import { useToast } from '../contexts/toast';
import { cn, formatRole } from '../lib/utils';
import type { UserRole } from '../types';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string; badgeClass: string }[] = [
  {
    value: 'admin',
    label: 'Quản trị viên (Admin)',
    description: 'Toàn quyền hệ thống: Kho, Tài chính, Nhân sự, Cấu hình & Quản lý tài khoản',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  },
  {
    value: 'manager',
    label: 'Quản lý (Manager)',
    description: 'Xem và xử lý Kho, Tài chính, Nhân sự, Báo cáo (không quản lý tài khoản hệ thống)',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  },
  {
    value: 'accountant',
    label: 'Kế toán (Accountant)',
    description: 'Toàn quyền Tài chính, Công nợ, Ứng tiền, Chấm công & Lương; chỉ xem dữ liệu Kho',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  },
  {
    value: 'warehouse_manager',
    label: 'Quản lý kho (Warehouse)',
    description: 'Toàn quyền thêm/sửa/xóa Nhập, Xay, Xuất, Cân & Kiểm kê kho; không xem Tài chính & Lương',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  {
    value: 'staff',
    label: 'Nhân viên kho (Staff)',
    description: 'Ghi phiếu Nhập, Xay, Xuất, Cân mới; không được sửa/xóa phiếu cũ và không xem Tài chính',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  },
];

function getRoleMeta(role: UserRole) {
  return ROLE_OPTIONS.find((r) => r.value === role) || ROLE_OPTIONS[4];
}

function formatDateTimeVN(iso?: string | null): string {
  if (!iso) return 'Chưa đăng nhập';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { data: users, loading, error, refetch } = useAsyncList(usersService.getAll, []);

  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (target: ManagedUser) => {
    if (target.id === currentUser?.id) {
      toast.warning('Không thể tự khóa tài khoản đang đăng nhập của chính mình.');
      return;
    }
    setTogglingId(target.id);
    try {
      const nextActive = !target.is_active;
      await usersService.updateAccount({
        userId: target.id,
        fullName: target.full_name,
        role: target.role,
        phone: target.phone || undefined,
        isActive: nextActive,
      });
      toast.success(
        nextActive
          ? `Đã mở khóa tài khoản ${target.username}`
          : `Đã khóa tài khoản ${target.username} và đăng xuất các phiên hiện tại`,
      );
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể thay đổi trạng thái tài khoản');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <Users size={16} className="text-[var(--primary-500)]" />
            Quản Lý Tài Khoản & Phân Quyền ({users.length})
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Tạo tài khoản theo tên đăng nhập, phân quyền vai trò, khóa tài khoản hoặc đặt lại mật khẩu cho
            nhân sự
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'accounts' && (
            <>
              <button
                type="button"
                onClick={() => void refetch()}
                className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
                title="Làm mới danh sách"
              >
                <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Thêm tài khoản</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher: Danh sách Tài khoản vs Ma trận Phân quyền */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeTab === 'accounts'
              ? 'bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          <Users size={14} />
          <span>Danh sách tài khoản ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={cn(
            'px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeTab === 'permissions'
              ? 'bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          <SlidersHorizontal size={14} />
          <span>Ma trận Phân quyền (UI)</span>
        </button>
      </div>

      {activeTab === 'permissions' ? (
        <PermissionMatrixPanel />
      ) : (
        <DataState
          loading={loading}
          error={error}
          isEmpty={users.length === 0}
          emptyTitle="Chưa có tài khoản người dùng"
          onRetry={refetch}
        >
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Tài khoản / Người dùng</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Vai trò & Phạm vi quyền</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Trạng thái</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Đăng nhập gần nhất</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const roleMeta = getRoleMeta(u.role);
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        'transition-colors hover:bg-[var(--bg-hover-row)]',
                        !u.is_active && 'opacity-65 bg-[var(--bg-subtle)]/40',
                      )}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                {u.full_name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-500)]/20">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                              <span className="font-semibold text-[var(--text-secondary)]">{u.username}</span>
                              {u.username !== u.email && <span>({u.email})</span>}
                              {u.phone && <span>· {u.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                              roleMeta.badgeClass,
                            )}
                          >
                            <ShieldCheck size={12} />
                            {formatRole(u.role)}
                          </span>
                          {u.custom_permissions && Object.keys(u.custom_permissions).length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-500)]/25">
                              {Object.keys(u.custom_permissions).length} quyền riêng
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">
                          {roleMeta.description}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Đã khóa
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Clock size={13} className="text-[var(--text-muted)] shrink-0" />
                          <span>{formatDateTimeVN(u.last_sign_in_at)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Sửa thông tin & phân quyền"
                          >
                            <Pencil size={13} />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound size={13} />
                            <span>Mật khẩu</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || togglingId === u.id}
                            onClick={() => void handleToggleActive(u)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                              u.is_active
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/60 dark:text-rose-400 dark:hover:bg-rose-950/30'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800/60 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
                            )}
                            title={
                              isSelf
                                ? 'Không thể tự khóa tài khoản của chính mình'
                                : u.is_active
                                  ? 'Khóa tài khoản'
                                  : 'Mở khóa tài khoản'
                            }
                          >
                            {u.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                            <span>{u.is_active ? 'Khóa' : 'Mở'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const roleMeta = getRoleMeta(u.role);
              return (
                <div
                  key={u.id}
                  className={cn(
                    'rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/30 p-4 space-y-3',
                    !u.is_active && 'opacity-70',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {u.full_name}
                          </p>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)]">
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-[var(--text-muted)] truncate">
                          Tên ĐN: <strong className="text-[var(--text-secondary)]">{u.username}</strong>
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0',
                        roleMeta.badgeClass,
                      )}
                    >
                      {formatRole(u.role)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                    <span>
                      Trạng thái:{' '}
                      <strong className={u.is_active ? 'text-emerald-600' : 'text-rose-600'}>
                        {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                      </strong>
                    </span>
                    <span>ĐN: {formatDateTimeVN(u.last_sign_in_at)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="btn-secondary py-2 text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Pencil size={13} />
                      <span>Sửa quyền</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResettingUser(u)}
                      className="btn-secondary py-2 text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <KeyRound size={13} />
                      <span>Mật khẩu</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSelf || togglingId === u.id}
                      onClick={() => void handleToggleActive(u)}
                      className="btn-secondary py-2 text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      {u.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                      <span>{u.is_active ? 'Khóa' : 'Mở khóa'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DataState>
      )}

      {createOpen && (
        <CreateUserAccountModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            void refetch();
          }}
        />
      )}

      {editingUser && (
        <EditUserAccountModal
          target={editingUser}
          isSelf={editingUser.id === currentUser?.id}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            void refetch();
          }}
        />
      )}

      {resettingUser && (
        <ResetUserPasswordModal
          target={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null);
            void refetch();
          }}
        />
      )}
    </section>
  );
}

function CreateUserAccountModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [account, setAccount] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizedAccount = account.trim().toLowerCase();
  const previewEmail =
    normalizedAccount && !normalizedAccount.includes('@')
      ? `${normalizedAccount}@accounts.khophe.local`
      : normalizedAccount;
  const selectedRoleMeta = getRoleMeta(role);

  return (
    <Modal isOpen onClose={onClose} title="Tạo tài khoản người dùng mới">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          if (password.length < 8) {
            toast.warning('Mật khẩu khởi tạo phải có ít nhất 8 ký tự.');
            return;
          }
          setSaving(true);
          try {
            await usersService.createAccount({
              account,
              fullName,
              role,
              password,
              phone,
            });
            toast.success(`Đã tạo tài khoản ${normalizedAccount} thành công`);
            onSuccess();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Không thể tạo tài khoản');
          } finally {
            setSaving(false);
          }
        }}
      >
        <FormField label="Tên đăng nhập hoặc Email" required>
          <input
            className="input-field font-mono"
            type="text"
            required
            placeholder="Ví dụ: nhanvien1 hoặc ten@congty.vn"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          {normalizedAccount && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Đăng nhập bằng:{' '}
              <strong className="font-mono text-[var(--text-primary)]">{normalizedAccount}</strong>{' '}
              {previewEmail !== normalizedAccount && <span>({previewEmail})</span>}
            </p>
          )}
        </FormField>

        <FormField label="Họ và tên hiển thị" required>
          <input
            className="input-field"
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormField>

        <FormField label="Vai trò phân quyền" required>
          <select
            className="input-field w-full"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-2.5 rounded-lg border border-[var(--border-color)]">
            {selectedRoleMeta.description}
          </p>
        </FormField>

        <FormField label="Số điện thoại">
          <input
            className="input-field font-mono"
            type="tel"
            placeholder="090..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>

        <FormField label="Mật khẩu khởi tạo (tối thiểu 8 ký tự)" required>
          <div className="relative">
            <input
              className="input-field pr-10 font-mono"
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              required
              placeholder="Nhập mật khẩu từ 8 ký tự trở lên"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary cursor-pointer" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary cursor-pointer" disabled={saving}>
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserAccountModal({
  target,
  isSelf,
  onClose,
  onSuccess,
}: {
  target: ManagedUser;
  isSelf: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { refreshPermissions } = useAuth();
  const [fullName, setFullName] = useState(target.full_name);
  const [role, setRole] = useState<UserRole>(target.role);
  const [phone, setPhone] = useState(target.phone || '');
  const [isActive, setIsActive] = useState(target.is_active);
  const [customPerms, setCustomPerms] = useState<Partial<Record<PermissionKey, boolean>>>(() => ({
    ...(target.custom_permissions || {}),
  }));
  const [showCustomPerms, setShowCustomPerms] = useState(() =>
    Boolean(target.custom_permissions && Object.keys(target.custom_permissions).length > 0),
  );
  const [saving, setSaving] = useState(false);

  const selectedRoleMeta = getRoleMeta(role);
  const overrideCount = Object.keys(customPerms).length;

  const setPermissionOverride = (key: PermissionKey, mode: 'inherit' | 'allow' | 'deny') => {
    setCustomPerms((prev) => {
      const next = { ...prev };
      if (mode === 'inherit') {
        delete next[key];
      } else {
        next[key] = mode === 'allow';
      }
      return next;
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={`Cập nhật tài khoản: ${target.username}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          try {
            await usersService.updateAccount({
              userId: target.id,
              fullName,
              role,
              phone,
              isActive,
              customPermissions: role === 'admin' ? {} : customPerms,
            });
            await refreshPermissions();
            toast.success(`Đã cập nhật tài khoản ${target.username}`);
            onSuccess();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Không thể cập nhật tài khoản');
          } finally {
            setSaving(false);
          }
        }}
      >
        <FormField label="Tên đăng nhập / Email">
          <input className="input-field font-mono opacity-70" type="text" disabled value={target.username} />
        </FormField>

        <FormField label="Họ và tên hiển thị" required>
          <input
            className="input-field"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormField>

        <FormField label="Số điện thoại">
          <input
            className="input-field font-mono"
            type="tel"
            placeholder="090..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>

        <FormField label="Vai trò phân quyền" required>
          <select
            className="input-field w-full disabled:opacity-60"
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-2.5 rounded-lg border border-[var(--border-color)]">
            {selectedRoleMeta.description}
          </p>
        </FormField>

        {role !== 'admin' && (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustomPerms(!showCustomPerms)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-[var(--primary-500)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Phân quyền ngoại lệ cho cá nhân này
                </span>
                {overrideCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)]">
                    {overrideCount} tùy chỉnh
                  </span>
                )}
              </div>
              {showCustomPerms ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showCustomPerms && (
              <div className="p-3 border-t border-[var(--border-color)] space-y-3 max-h-64 overflow-y-auto bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Mặc định tài khoản sẽ hưởng quyền theo vai trò {formatRole(role)}.</span>
                  {overrideCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomPerms({})}
                      className="font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Xóa hết ngoại lệ
                    </button>
                  )}
                </div>

                {PERMISSION_GROUPS.map((group) => {
                  const editableItems = group.items.filter((i) => !i.adminLocked);
                  if (editableItems.length === 0) return null;
                  return (
                    <div key={group.id} className="space-y-1.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                        {group.title}
                      </p>
                      <div className="space-y-1">
                        {editableItems.map((item) => {
                          const currentVal = customPerms[item.key];
                          const mode: 'inherit' | 'allow' | 'deny' =
                            typeof currentVal === 'boolean' ? (currentVal ? 'allow' : 'deny') : 'inherit';
                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]"
                            >
                              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                                {item.label}
                              </span>
                              <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-0.5 shrink-0 text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setPermissionOverride(item.key, 'inherit')}
                                  className={cn(
                                    'px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                                    mode === 'inherit'
                                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                                      : 'text-[var(--text-muted)]',
                                  )}
                                >
                                  Theo vai trò
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPermissionOverride(item.key, 'allow')}
                                  className={cn(
                                    'px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                                    mode === 'allow'
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-[var(--text-muted)]',
                                  )}
                                >
                                  Bật riêng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPermissionOverride(item.key, 'deny')}
                                  className={cn(
                                    'px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                                    mode === 'deny' ? 'bg-rose-600 text-white' : 'text-[var(--text-muted)]',
                                  )}
                                >
                                  Tắt riêng
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <FormField label="Trạng thái tài khoản">
          <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              disabled={isSelf}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary-600)]"
            />
            <span>Cho phép đăng nhập và truy cập hệ thống</span>
          </label>
          {isSelf && (
            <p className="mt-1 text-[11px] text-amber-600">
              Bạn đang đăng nhập bằng tài khoản này nên không thể tự khóa hoặc tự hạ quyền Quản trị viên.
            </p>
          )}
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary cursor-pointer" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary cursor-pointer" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetUserPasswordModal({
  target,
  onClose,
  onSuccess,
}: {
  target: ManagedUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <Modal isOpen onClose={onClose} title={`Đặt lại mật khẩu: ${target.username}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          if (newPassword.length < 8) {
            toast.warning('Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
          }
          if (newPassword !== confirmPassword) {
            toast.warning('Mật khẩu xác nhận không khớp.');
            return;
          }
          setSaving(true);
          try {
            await usersService.resetPassword(target.id, newPassword);
            toast.success(`Đã đặt lại mật khẩu mới cho ${target.username}`);
            onSuccess();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu');
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="rounded-xl bg-[var(--bg-subtle)] p-3 border border-[var(--border-color)] text-xs space-y-1">
          <p className="font-bold text-[var(--text-primary)]">{target.full_name}</p>
          <p className="text-[var(--text-muted)] font-mono">
            Tài khoản: <strong className="text-[var(--text-secondary)]">{target.username}</strong> ·{' '}
            {formatRole(target.role)}
          </p>
        </div>

        <FormField label="Mật khẩu mới (tối thiểu 8 ký tự)" required>
          <div className="relative">
            <input
              className="input-field pr-10 font-mono"
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              required
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <FormField label="Nhập lại mật khẩu mới" required>
          <input
            className="input-field font-mono"
            type={showPassword ? 'text' : 'password'}
            minLength={8}
            required
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary cursor-pointer" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn-primary cursor-pointer" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
