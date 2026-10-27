import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { useAsyncList } from '../hooks/useAsyncData';
import { useToast } from '../contexts/toast';
import { useAuth } from '../contexts/auth';
import { ConfirmDialog } from './ConfirmDialog';
import { DataState } from './DataState';
import { permissionsService } from '../services/permissionsService';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  resolveEffectivePermissions,
  type PermissionKey,
  type PermissionMap,
} from '../lib/permissions';
import { cn } from '../lib/utils';
import type { UserRole } from '../types';

const ROLES_CONFIG: {
  role: UserRole;
  label: string;
  shortLabel: string;
  badgeClass: string;
  locked?: boolean;
}[] = [
  {
    role: 'admin',
    label: 'Quản trị HT',
    shortLabel: 'Admin',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    locked: true,
  },
  {
    role: 'manager',
    label: 'Giám đốc',
    shortLabel: 'Giám đốc',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  {
    role: 'warehouse_manager',
    label: 'QL Xưởng/Kho',
    shortLabel: 'QL Xưởng/Kho',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  {
    role: 'accountant',
    label: 'Kế toán',
    shortLabel: 'Kế toán',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    role: 'staff',
    label: 'Thu mua',
    shortLabel: 'Thu mua',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
];

type EditableRole = Exclude<UserRole, 'admin'>;
const EDITABLE_ROLES: EditableRole[] = ['manager', 'accountant', 'warehouse_manager', 'staff'];

export function PermissionMatrixPanel() {
  const { toast } = useToast();
  const { refreshPermissions } = useAuth();
  const { data: rows, loading, error, refetch } = useAsyncList(permissionsService.getMatrix, []);

  const [draftMatrix, setDraftMatrix] = useState<Record<UserRole, PermissionMap>>(() => ({
    admin: { ...DEFAULT_ROLE_PERMISSIONS.admin },
    manager: { ...DEFAULT_ROLE_PERMISSIONS.manager },
    accountant: { ...DEFAULT_ROLE_PERMISSIONS.accountant },
    warehouse_manager: { ...DEFAULT_ROLE_PERMISSIONS.warehouse_manager },
    staff: { ...DEFAULT_ROLE_PERMISSIONS.staff },
  }));

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [mobileSelectedRole, setMobileSelectedRole] = useState<UserRole>('manager');
  const [saving, setSaving] = useState(false);
  const [confirmResetRole, setConfirmResetRole] = useState<UserRole | 'all' | null>(null);
  const [resetting, setResetting] = useState(false);

  const serverMatrix = useMemo<Record<UserRole, PermissionMap>>(() => {
    const base: Record<UserRole, PermissionMap> = {
      admin: { ...DEFAULT_ROLE_PERMISSIONS.admin },
      manager: { ...DEFAULT_ROLE_PERMISSIONS.manager },
      accountant: { ...DEFAULT_ROLE_PERMISSIONS.accountant },
      warehouse_manager: { ...DEFAULT_ROLE_PERMISSIONS.warehouse_manager },
      staff: { ...DEFAULT_ROLE_PERMISSIONS.staff },
    };
    for (const row of rows) {
      if (row.role && base[row.role]) {
        base[row.role] = resolveEffectivePermissions(row.role, row.permissions);
      }
    }
    return base;
  }, [rows]);

  useEffect(() => {
    setDraftMatrix(serverMatrix);
  }, [serverMatrix]);

  const changedRoles = useMemo(() => {
    const changed: EditableRole[] = [];
    for (const role of EDITABLE_ROLES) {
      const hasDiff = ALL_PERMISSION_KEYS.some(
        (key) => Boolean(draftMatrix[role]?.[key]) !== Boolean(serverMatrix[role]?.[key]),
      );
      if (hasDiff) changed.push(role);
    }
    return changed;
  }, [draftMatrix, serverMatrix]);

  const isCellDirty = (role: UserRole, key: PermissionKey): boolean => {
    if (role === 'admin') return false;
    return Boolean(draftMatrix[role]?.[key]) !== Boolean(serverMatrix[role]?.[key]);
  };

  const handleTogglePermission = (role: UserRole, key: PermissionKey) => {
    if (role === 'admin' || key === 'settings.manage') return;
    setDraftMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key],
      },
    }));
  };

  const handleToggleGroupForRole = (role: UserRole, groupKeys: PermissionKey[]) => {
    if (role === 'admin') return;
    const editableKeys = groupKeys.filter((k) => k !== 'settings.manage');
    if (editableKeys.length === 0) return;

    const allEnabled = editableKeys.every((k) => Boolean(draftMatrix[role]?.[k]));
    const nextValue = !allEnabled;

    setDraftMatrix((prev) => {
      const updated = { ...prev[role] };
      for (const k of editableKeys) {
        updated[k] = nextValue;
      }
      return {
        ...prev,
        [role]: updated,
      };
    });
  };

  const handleSaveChanges = async () => {
    if (changedRoles.length === 0 || saving) return;
    setSaving(true);
    try {
      for (const role of changedRoles) {
        await permissionsService.updateRolePermissions(role, draftMatrix[role]);
      }
      await refetch();
      await refreshPermissions();
      toast.success(`Đã lưu cấu hình phân quyền cho ${changedRoles.length} vai trò`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu cấu hình phân quyền');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!confirmResetRole || resetting) return;
    setResetting(true);
    try {
      await permissionsService.resetRolePermissions(
        confirmResetRole === 'all' ? undefined : confirmResetRole,
      );
      await refetch();
      await refreshPermissions();
      toast.success(
        confirmResetRole === 'all'
          ? 'Đã khôi phục toàn bộ ma trận phân quyền về mặc định'
          : 'Đã khôi phục phân quyền mặc định cho vai trò đã chọn',
      );
      setConfirmResetRole(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể khôi phục phân quyền mặc định');
    } finally {
      setResetting(false);
    }
  };

  const countEnabled = (role: UserRole): number =>
    ALL_PERMISSION_KEYS.filter((k) => Boolean(draftMatrix[role]?.[k])).length;

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-subtle)]/50 p-4 rounded-xl border border-[var(--border-color)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center shrink-0 border border-[var(--primary-500)]/20">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Ma Trận Phân Quyền Theo Vai Trò (5 Nhóm)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Bật hoặc tắt từng quyền truy cập menu và thao tác dữ liệu. Thay đổi có hiệu lực ngay trên cả
              giao diện lẫn cơ sở dữ liệu (Supabase RLS).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmResetRole('all')}
            disabled={saving || resetting}
            className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Khôi phục mặc định</span>
          </button>

          {changedRoles.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setDraftMatrix(serverMatrix)}
                disabled={saving}
                className="btn-secondary text-xs cursor-pointer"
              >
                Hủy ({changedRoles.length})
              </button>
              <button
                type="button"
                onClick={() => void handleSaveChanges()}
                disabled={saving}
                className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>{saving ? 'Đang lưu...' : `Lưu phân quyền (${changedRoles.length})`}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading || error ? (
        <DataState loading={loading} error={error} onRetry={() => void refetch()} skeletonType="table" />
      ) : (
        <>
          {/* Mobile Role Selector & Switch List */}
          <div className="lg:hidden space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {ROLES_CONFIG.map((r) => {
                const active = mobileSelectedRole === r.role;
                const isModified = r.role !== 'admin' && changedRoles.includes(r.role as EditableRole);
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setMobileSelectedRole(r.role)}
                    className={cn(
                      'tap-target px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                      active
                        ? 'bg-[var(--primary-600)] text-white border-[var(--primary-600)] shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]',
                    )}
                  >
                    <span>{r.label}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold',
                        active ? 'bg-white/20 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
                      )}
                    >
                      {countEnabled(r.role)}/{ALL_PERMISSION_KEYS.length}
                    </span>
                    {isModified && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>

            {PERMISSION_GROUPS.map((group) => {
              const groupKeys = group.items.map((i) => i.key);
              const editableKeys = groupKeys.filter((k) => k !== 'settings.manage');
              const allOn = editableKeys.every((k) => Boolean(draftMatrix[mobileSelectedRole]?.[k]));
              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden"
                >
                  <div className="px-4 py-3 bg-[var(--bg-subtle)]/60 border-b border-[var(--border-color)] flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
                        {group.title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{group.subtitle}</p>
                    </div>
                    {mobileSelectedRole !== 'admin' && editableKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleToggleGroupForRole(mobileSelectedRole, groupKeys)}
                        className="text-[11px] font-bold text-[var(--primary-600)] hover:underline shrink-0 cursor-pointer"
                      >
                        {allOn ? 'Tắt nhóm' : 'Bật nhóm'}
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {group.items.map((item) => {
                      const checked = Boolean(draftMatrix[mobileSelectedRole]?.[item.key]);
                      const locked = mobileSelectedRole === 'admin' || Boolean(item.adminLocked);
                      const dirty = isCellDirty(mobileSelectedRole, item.key);
                      return (
                        <div
                          key={item.key}
                          className={cn(
                            'p-3.5 flex items-center justify-between gap-3',
                            dirty && 'bg-amber-50/40 dark:bg-amber-950/20',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[var(--text-primary)]">{item.label}</p>
                              {dirty && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                  Đã sửa
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.description}</p>
                          </div>

                          <PermissionSwitch
                            checked={checked}
                            disabled={locked}
                            onChange={() => handleTogglePermission(mobileSelectedRole, item.key)}
                            label={`${item.label} - ${mobileSelectedRole}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop 2D Permission Matrix Table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)]">
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] min-w-[320px]">
                    Chức năng / Quyền hạn nghiệp vụ
                  </th>
                  {ROLES_CONFIG.map((r) => {
                    const enabledCount = countEnabled(r.role);
                    const isModified = r.role !== 'admin' && changedRoles.includes(r.role as EditableRole);
                    return (
                      <th key={r.role} className="py-3 px-3 text-center w-[150px] align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                              r.badgeClass,
                            )}
                          >
                            {r.locked ? <Lock size={11} /> : <ShieldCheck size={11} />}
                            {r.label}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {enabledCount}/{ALL_PERMISSION_KEYS.length} quyền
                          </span>
                          {isModified && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              ● Chưa lưu
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {PERMISSION_GROUPS.map((group) => {
                  const isCollapsed = Boolean(collapsedGroups[group.id]);
                  const groupKeys = group.items.map((i) => i.key);
                  const editableKeys = groupKeys.filter((k) => k !== 'settings.manage');

                  return (
                    <FragmentGroup
                      key={group.id}
                      group={group}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      rolesConfig={ROLES_CONFIG}
                      draftMatrix={draftMatrix}
                      editableKeys={editableKeys}
                      onToggleGroupForRole={(role) => handleToggleGroupForRole(role, groupKeys)}
                      onTogglePermission={handleTogglePermission}
                      isCellDirty={isCellDirty}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]/40 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)]">
            <Info size={14} className="text-[var(--primary-500)] shrink-0" />
            <span>
              Mẹo: Ngoài phân quyền chung theo 5 vai trò ở bảng trên, bạn có thể bấm nút{' '}
              <strong className="text-[var(--text-primary)]">Sửa</strong> ở từng tài khoản trong tab{' '}
              <strong className="text-[var(--text-primary)]">Danh sách tài khoản</strong> để cấp hoặc thu hồi
              quyền ngoại lệ cho riêng cá nhân đó.
            </span>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmResetRole)}
        title="Khôi phục phân quyền mặc định"
        message="Bạn có chắc chắn muốn đưa cấu hình phân quyền của các vai trò về trạng thái mặc định chuẩn ban đầu của xưởng không?"
        confirmText={resetting ? 'Đang khôi phục...' : 'Khôi phục mặc định'}
        variant="warning"
        onClose={() => setConfirmResetRole(null)}
        onConfirm={() => void handleConfirmReset()}
      />
    </div>
  );
}

function FragmentGroup({
  group,
  isCollapsed,
  onToggleCollapse,
  rolesConfig,
  draftMatrix,
  editableKeys,
  onToggleGroupForRole,
  onTogglePermission,
  isCellDirty,
}: {
  group: (typeof PERMISSION_GROUPS)[number];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  rolesConfig: typeof ROLES_CONFIG;
  draftMatrix: Record<UserRole, PermissionMap>;
  editableKeys: PermissionKey[];
  onToggleGroupForRole: (role: UserRole) => void;
  onTogglePermission: (role: UserRole, key: PermissionKey) => void;
  isCellDirty: (role: UserRole, key: PermissionKey) => boolean;
}) {
  return (
    <>
      <tr className="bg-[var(--bg-subtle)]/70">
        <td className="py-2.5 px-4">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight size={15} className="text-[var(--text-muted)]" />
            ) : (
              <ChevronDown size={15} className="text-[var(--text-muted)]" />
            )}
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)] group-hover:text-[var(--primary-600)] transition-colors">
                {group.title}
              </span>
              <p className="text-[11px] text-[var(--text-muted)] font-normal">{group.subtitle}</p>
            </div>
          </button>
        </td>
        {rolesConfig.map((r) => {
          if (r.locked || editableKeys.length === 0) {
            return (
              <td key={r.role} className="py-2 px-3 text-center">
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">Cố định</span>
              </td>
            );
          }
          const allOn = editableKeys.every((k) => Boolean(draftMatrix[r.role]?.[k]));
          return (
            <td key={r.role} className="py-2 px-3 text-center">
              <button
                type="button"
                onClick={() => onToggleGroupForRole(r.role)}
                className="text-[11px] font-bold text-[var(--primary-600)] hover:underline cursor-pointer"
              >
                {allOn ? 'Tắt nhóm' : 'Bật nhóm'}
              </button>
            </td>
          );
        })}
      </tr>

      {!isCollapsed &&
        group.items.map((item) => (
          <tr
            key={item.key}
            className="hover:bg-[var(--bg-hover-row)] transition-colors bg-[var(--bg-surface)]"
          >
            <td className="py-3 px-4">
              <div className="pl-5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[var(--text-primary)]">{item.label}</span>
                  <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                    {item.key}
                  </code>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.description}</p>
              </div>
            </td>

            {rolesConfig.map((r) => {
              const checked = Boolean(draftMatrix[r.role]?.[item.key]);
              const locked = Boolean(r.locked || item.adminLocked);
              const dirty = isCellDirty(r.role, item.key);

              return (
                <td
                  key={r.role}
                  className={cn(
                    'py-3 px-3 text-center align-middle transition-colors',
                    dirty && 'bg-amber-50/60 dark:bg-amber-950/25',
                  )}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <PermissionSwitch
                      checked={checked}
                      disabled={locked}
                      onChange={() => onTogglePermission(r.role, item.key)}
                      label={`${item.label} - ${r.label}`}
                    />
                    {dirty && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Đã sửa</span>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}

function PermissionSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  if (disabled) {
    return (
      <span
        title={checked ? 'Quyền cố định cho Quản trị viên' : 'Chỉ dành riêng cho Quản trị viên'}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold select-none',
          checked
            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-60',
        )}
      >
        {checked ? <CheckCircle2 size={13} /> : <Lock size={12} />}
        <span>{checked ? 'Toàn quyền' : 'Chỉ Admin'}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]',
        checked ? 'bg-[var(--primary-600)]' : 'bg-slate-300 dark:bg-slate-700',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
