import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { MobileBottomSheet } from './MobileBottomSheet';
import { 
  Users, Package, BarChart3, Settings, 
  LogOut, Recycle, Wallet, UserCheck, Sun, Leaf, Moon, Check 
} from 'lucide-react';
import { useAuth } from '../../contexts/auth';
import { useTheme, PRIMARY_COLORS, type Theme } from '../../contexts/theme';
import { cn } from '../../lib/utils';

interface MobileMoreMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { path: '/phe', label: 'Quản lý Phế', icon: Recycle },
  { path: '/ton-kho', label: 'Tồn kho', icon: Package },
  { path: '/tai-chinh', label: 'Tài chính', icon: Wallet, managerOnly: true },
  { path: '/nhan-vien', label: 'Quản lý Nhân sự', icon: UserCheck, managerOnly: true },
  { path: '/danh-ba', label: 'Danh bạ đối tác', icon: Users },
  { path: '/bao-cao', label: 'Báo cáo', icon: BarChart3 },
  { path: '/cai-dat', label: 'Cài đặt hệ thống', icon: Settings },
];

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'light', label: 'Sáng', icon: Sun },
  { id: 'nature', label: 'Bảo vệ', icon: Leaf },
  { id: 'dark', label: 'Tối', icon: Moon },
];

export const MobileMoreMenuSheet: React.FC<MobileMoreMenuSheetProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const visibleItems = MENU_ITEMS.filter(item => !item.managerOnly || isManagerOrAdmin);

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title="Danh mục & Cài đặt">
      <div className="space-y-6 pb-4">
        {/* User Info Card */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white font-black text-base shadow-sm">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{user?.name || 'Người dùng'}</h4>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email || '—'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[var(--primary-50)] text-[var(--primary-600)]">
              {user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'manager' ? 'Giám đốc / Quản lý' : 'Nhân viên xưởng'}
            </span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-1">
            Menu chức năng
          </h5>
          <div className="grid grid-cols-2 gap-2.5">
            {visibleItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-all text-xs font-bold active:scale-98",
                  isActive
                    ? "bg-[var(--primary-50)] border-[var(--primary-500)] text-[var(--primary-600)] shadow-xs"
                    : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--primary-500)] shrink-0">
                  <item.icon size={18} />
                </div>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Quick Personalization */}
        <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-1">
            Giao diện ứng dụng
          </h5>
          
          {/* Theme Mode */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95",
                  theme === id
                    ? "bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Color Palettes */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            {PRIMARY_COLORS.map(({ id, name, hex }) => {
              const active = primaryColor === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrimaryColor(id)}
                  title={name}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90",
                    active && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]"
                  )}
                  style={{ backgroundColor: hex }}
                >
                  {active && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 font-bold text-xs active:scale-98 transition-all"
          >
            <LogOut size={16} /> Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
