import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Check, Sun, Leaf, Moon } from 'lucide-react';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/auth';
import { useTheme, PRIMARY_COLORS, type Theme, type Density } from '../contexts/theme';

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'light', label: 'Sáng', icon: Sun },
  { id: 'nature', label: 'Bảo vệ', icon: Leaf },
  { id: 'dark', label: 'Tối', icon: Moon },
];

export const UserProfilePopover = () => {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor, density, setDensity } = useTheme();
  const navigate = useNavigate();
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown) return;
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
      if (e.key === 'Tab' && popoverRef.current) {
        const focusable = popoverRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    if (showDropdown) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown]);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="relative">
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        aria-label="Menu người dùng"
        className="tap-target min-h-[44px] flex items-center gap-2 hover:bg-[var(--bg-subtle)] p-1.5 pr-2.5 rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
            {user?.name || 'Người dùng'}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] leading-tight">
            {user?.email?.endsWith('@accounts.khophe.local') ? user.email.split('@')[0] : user?.email || '—'}
          </span>
        </div>
        <ChevronDown size={14} className="text-[var(--text-muted)] hidden sm:block" />
      </button>

      {showDropdown && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          {/* CIC-IBST Style User Popover Menu */}
          <div
            ref={popoverRef}
            role="menu"
            className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 shadow-xl z-50 animate-fade-in text-left"
          >
            {/* User info header */}
            <div className="pb-3 border-b border-[var(--border-color)]">
              <p className="text-[13px] font-bold text-[var(--text-primary)]">{user?.name || 'Người dùng'}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {user?.email?.endsWith('@accounts.khophe.local')
                  ? user.email.split('@')[0]
                  : user?.email || '—'}
              </p>
            </div>

            {/* CÀI ĐẶT CÁ NHÂN */}
            <div className="py-3.5 space-y-4 border-b border-[var(--border-color)]">
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                CÀI ĐẶT CÁ NHÂN
              </div>

              {/* 1. Giao diện nền */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Giao diện nền</div>
                <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border-color)]">
                  {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTheme(id)}
                      className={cn(
                        'tap-target md:min-h-0 md:min-w-0 flex-1 flex items-center justify-center gap-1 md:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        theme === id
                          ? 'bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      <Icon size={12} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Màu sắc chủ đạo */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Màu sắc chủ đạo</div>
                <div className="grid grid-cols-9 gap-1.5 justify-items-center rounded-xl bg-[var(--bg-subtle)] p-2 border border-[var(--border-color)]">
                  {PRIMARY_COLORS.map(({ id, name, hex }) => {
                    const active = primaryColor === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPrimaryColor(id)}
                        title={name}
                        className={cn(
                          'tap-target md:min-w-0 md:min-h-0 md:w-5 md:h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer',
                          active && 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]',
                        )}
                        style={{
                          backgroundColor: hex,
                          boxShadow: active ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${hex}` : undefined,
                        }}
                      >
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Đang chọn:{' '}
                  <span className="font-bold text-[var(--primary-500)]">
                    {PRIMARY_COLORS.find((c) => c.id === primaryColor)?.name}
                  </span>
                </p>
              </div>

              {/* 3. Mật độ hiển thị */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Mật độ hiển thị</div>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border-color)]">
                  {(['comfortable', 'compact', 'dense'] as Density[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={cn(
                        'tap-target md:min-w-0 md:min-h-0 md:py-1 text-xs md:text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center',
                        density === d
                          ? 'bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {d === 'comfortable' ? '100%' : d === 'compact' ? '90%' : '80%'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary w-full mt-3 text-xs"
              onClick={() => {
                setShowDropdown(false);
                setPasswordOpen(true);
              }}
            >
              Đổi mật khẩu
            </button>
            {/* Logout Button */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="tap-target w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Đăng xuất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
