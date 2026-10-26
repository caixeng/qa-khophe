import { useState, useEffect, useMemo, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Home, Users, Package, BarChart3, Settings, UserCheck, Search, Recycle, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/auth';
import { Breadcrumb } from '../components/Breadcrumb';
import { GlobalSearch } from '../components/GlobalSearch';
import { KpiCardSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { DesktopSidebar, type MenuItem } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { UserProfilePopover } from './UserProfilePopover';

const PageLoadingSkeleton = () => (
  <div className="space-y-6">
    <KpiCardSkeleton />
    <TableSkeleton rows={8} />
  </div>
);

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', path: '/', label: 'Tổng quan', icon: Home },
  { id: 'phe', path: '/phe', label: 'Quản lý Phế', icon: Recycle, permission: 'scrap.view' },
  { id: 'inventory', path: '/ton-kho', label: 'Tồn kho', icon: Package, permission: 'inventory.view' },
  { id: 'finance', path: '/tai-chinh', label: 'Tài chính', icon: Wallet, permission: 'finance.view' },
  { id: 'employees', path: '/nhan-vien', label: 'Quản lý Nhân sự', icon: UserCheck, permission: 'hr.view' },
  { id: 'contacts', path: '/danh-ba', label: 'Danh bạ đối tác', icon: Users, permission: 'contacts.view' },
  {
    id: 'reconciliation',
    path: '/doi-soat',
    label: 'Đối soát dữ liệu',
    icon: BarChart3,
    permission: 'reconciliation.view',
  },
  { id: 'reports', path: '/bao-cao', label: 'Báo cáo', icon: BarChart3, permission: 'reports.view' },
  { id: 'settings', path: '/cai-dat', label: 'Cài đặt', icon: Settings, permission: 'settings.manage' },
];

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const { can } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);

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

  const visibleMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => !item.permission || can(item.permission));
  }, [can]);

  return (
    <div className="app-viewport flex w-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--bg-surface)] focus:text-[var(--text-primary)] top-0 left-0"
      >
        Chuyển tới nội dung chính
      </a>

      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} visibleMenuItems={visibleMenuItems} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* MOBILE HEADER (< lg) — chuẩn qlda-ddcn-ht-selfhost */}
        <MobileHeader onOpenSearch={() => setSearchOpen(true)} />

        {/* DESKTOP HEADER (lg+) */}
        <header className="app-topbar hidden lg:flex h-[76px] shrink-0 items-center justify-between px-8 border-b border-[var(--border-color)] z-30">
          <div className="flex items-center">
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search Trigger (Ctrl+K) */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm toàn hệ thống"
              className="flex items-center gap-2 rounded-xl border border-border bg-subtle px-3 py-2 text-xs text-ink-muted shadow-card transition-all hover:bg-[var(--bg-hover-row)] cursor-pointer"
            >
              <Search size={14} />
              <span>Tìm kiếm...</span>
              <kbd className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink-muted">
                Ctrl+K
              </kbd>
            </button>

            <UserProfilePopover />
          </div>
        </header>

        {/* SCROLLABLE OUTLET */}
        <main
          id="main-content"
          className="mobile-scroll-area flex-1 overflow-y-auto py-3 px-3 sm:px-4 lg:px-8 lg:py-7 pb-8"
        >
          <div className="w-full max-w-[1680px] mx-auto">
            <Suspense fallback={<PageLoadingSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <MobileBottomNav onOpenSearch={() => setSearchOpen(true)} />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
