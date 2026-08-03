import * as React from 'react';
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Package, BarChart3, Settings,
  Menu, ChevronLeft, ChevronRight, LogOut, Recycle, Wallet,
  ChevronDown, Sun, Leaf, Moon, Check, UserCheck, Search, Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, PRIMARY_COLORS, type Theme, type Density } from '../contexts/ThemeContext';
import { Breadcrumb } from '../components/Breadcrumb';
import { GlobalSearch } from '../components/GlobalSearch';
import { MobileManagerInput } from '../components/mobile/MobileManagerInput';
import { MobileMoreMenuSheet } from '../components/mobile/MobileMoreMenuSheet';
import { MobileQuickActionModal } from '../components/mobile/MobileQuickActionModal';
import { Suspense } from 'react';
import { KpiCardSkeleton, TableSkeleton } from '../components/SkeletonLoader';

const PageLoadingSkeleton = () => (
  <div className="space-y-6">
    <KpiCardSkeleton />
    <TableSkeleton rows={8} />
  </div>
);

const MENU_ITEMS = [
  { id: 'dashboard', path: '/', label: 'Tổng quan', icon: Home },
  { id: 'phe', path: '/phe', label: 'Quản lý Phế', icon: Recycle },
  { id: 'inventory', path: '/ton-kho', label: 'Tồn kho', icon: Package },
  { id: 'finance', path: '/tai-chinh', label: 'Tài chính', icon: Wallet, managerOnly: true },
  { id: 'employees', path: '/nhan-vien', label: 'Quản lý Nhân sự', icon: UserCheck, managerOnly: true },
  { id: 'contacts', path: '/danh-ba', label: 'Danh bạ đối tác', icon: Users },
  { id: 'reports', path: '/bao-cao', label: 'Báo cáo', icon: BarChart3 },
  { id: 'settings', path: '/cai-dat', label: 'Cài đặt', icon: Settings },
];

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: 'light', label: 'Sáng', icon: Sun },
  { id: 'nature', label: 'Bảo vệ', icon: Leaf },
  { id: 'dark', label: 'Tối', icon: Moon },
];

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const { user, logout } = useAuth();
  const { theme, setTheme, primaryColor, setPrimaryColor, density, setDensity } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed.toString());
  }, [collapsed]);

  // Ctrl/Cmd + K mở tìm kiếm toàn cục
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const visibleMenuItems = MENU_ITEMS.filter((item) => !item.managerOnly || isManagerOrAdmin);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--bg-surface)] focus:text-[var(--text-primary)] top-0 left-0">
        Chuyển tới nội dung chính
      </a>
      
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-color)] transition-all duration-300 z-20 shadow-sm relative",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary-500)] p-0.5 shadow-md shrink-0 overflow-hidden ring-1 ring-[var(--primary-400)]/30">
              <img src="/vua_phe_logo2.jpg" alt="VUA PHẾ Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-lg tracking-tight text-[var(--primary-500)] whitespace-nowrap leading-none">
                  VUA PHẾ
                </span>
                <span className="text-[10px] font-extrabold tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
                  Tái chế & Quản lý Xưởng
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className="p-1.5 hover:bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-all absolute -right-3 top-5"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav role="navigation" aria-label="Menu chính" className="flex-1 overflow-y-auto py-4 px-2 space-y-1.5">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={() => {
                const isCurrent = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return cn(
                  "flex items-center px-3.5 py-3 rounded-xl transition-all font-bold text-[13px] group relative",
                  isCurrent 
                    ? "bg-[var(--primary-50)] text-[var(--primary-600)] shadow-xs font-bold" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                );
              }}
            >
              <item.icon className={cn("shrink-0 transition-transform group-hover:scale-110", collapsed ? "mx-auto" : "mr-3")} size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/50">
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
            <div className="w-8 h-8 rounded-full bg-[var(--primary-500)] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate text-[var(--text-primary)]">{user?.name || 'Người dùng'}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border-color)] z-30 shadow-xs">
          <div className="flex items-center">
            <div className="hidden sm:block">
              <Breadcrumb />
            </div>
            <div className="sm:hidden flex items-center gap-2">
              <img src="/vua_phe_logo2.jpg" alt="VUA PHẾ Logo" className="w-7 h-7 rounded-lg object-cover ring-1 ring-[var(--primary-400)]/30" />
              <span className="font-black text-base text-[var(--primary-500)]">VUA PHẾ</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search Trigger (Ctrl+K) */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm toàn hệ thống"
              className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-subtle px-3 py-2 text-xs text-ink-muted shadow-card transition-all hover:bg-[var(--bg-hover-row)] cursor-pointer"
            >
              <Search size={14} />
              <span className="hidden md:inline">Tìm kiếm...</span>
              <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">
                Ctrl+K
              </kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm toàn hệ thống"
              className="sm:hidden p-2 rounded-xl border border-border bg-subtle text-[var(--text-muted)] cursor-pointer"
            >
              <Search size={16} />
            </button>

            {/* User Profile & Quick Settings Menu (Dropdown) */}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Menu người dùng"
                className="flex items-center gap-2 hover:bg-[var(--bg-subtle)] p-1.5 pr-2.5 rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
                    {user?.name || 'Người dùng'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                    {user?.email || '—'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[var(--text-muted)] hidden sm:block" />
              </button>

              {showDropdown && (
                <>
                  {/* Backdrop to close */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  
                  {/* CIC-IBST Style User Popover Menu */}
                  <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 shadow-xl z-50 animate-fade-in text-left">
                    {/* User info header */}
                    <div className="pb-3 border-b border-[var(--border-color)]">
                      <p className="text-[13px] font-bold text-[var(--text-primary)]">{user?.name || 'Người dùng'}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{user?.email || '—'}</p>
                    </div>

                    {/* CÀI ĐẶT CÁ NHÂN */}
                    <div className="py-3.5 space-y-4 border-b border-[var(--border-color)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
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
                                "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                theme === id
                                  ? "bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]"
                                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                                  "w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer",
                                  active && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]"
                                )}
                                style={{
                                  backgroundColor: hex,
                                  boxShadow: active ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${hex}` : undefined
                                }}
                              >
                                {active && <Check size={10} className="text-white" strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          Đang chọn: <span className="font-bold text-[var(--primary-500)]">{PRIMARY_COLORS.find(c => c.id === primaryColor)?.name}</span>
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
                                "py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center",
                                density === d
                                  ? "bg-[var(--bg-surface)] text-[var(--primary-600)] shadow-xs border border-[var(--border-color)]"
                                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              {d === 'comfortable' ? '100%' : d === 'compact' ? '90%' : '80%'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-2">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE OUTLET */}
        <main id="main-content" className="flex-1 overflow-y-auto pt-4 px-4 lg:px-6 pb-8">
          <div className="w-full">
            <Suspense fallback={<PageLoadingSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav role="navigation" aria-label="Menu di động" className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-color)] flex justify-between items-center h-16 px-2 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-safe-area">
        <NavLink
          to="/"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95",
            isActive ? "text-[var(--primary-600)] font-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
          )}
        >
          <Home size={20} />
          <span className="text-[10px] truncate">Trang chủ</span>
        </NavLink>

        <NavLink
          to="/phe"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95",
            isActive ? "text-[var(--primary-600)] font-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
          )}
        >
          <Recycle size={20} />
          <span className="text-[10px] truncate">QL Phế</span>
        </NavLink>

        {/* Center Floating Action Button (FAB) */}
        <div className="flex-1 flex justify-center items-center h-full relative -top-3">
          <button
            onClick={() => setQuickActionOpen(true)}
            aria-label="Thao tác nhanh"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary-500)]/40 border-4 border-[var(--bg-surface)] active:scale-90 transition-transform cursor-pointer"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <NavLink
          to="/ton-kho"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95",
            isActive ? "text-[var(--primary-600)] font-black" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
          )}
        >
          <Package size={20} />
          <span className="text-[10px] truncate">Tồn kho</span>
        </NavLink>

        <button
          onClick={() => setMoreMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium active:scale-95 cursor-pointer"
        >
          <Menu size={20} />
          <span className="text-[10px] truncate">Thêm</span>
        </button>
      </nav>

      {/* MOBILE SHEETS */}
      <MobileMoreMenuSheet isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
      <MobileQuickActionModal isOpen={quickActionOpen} onClose={() => setQuickActionOpen(false)} />

      {isManagerOrAdmin && <MobileManagerInput />}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
