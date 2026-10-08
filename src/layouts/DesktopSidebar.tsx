import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Recycle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/auth';

export interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  managerOnly?: boolean;
  adminOnly?: boolean;
}

interface DesktopSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  visibleMenuItems: MenuItem[];
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  collapsed,
  setCollapsed,
  visibleMenuItems,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'app-sidebar hidden lg:flex flex-col shrink-0 transition-all duration-300 z-20 relative',
        collapsed ? 'w-[76px]' : 'w-[256px]',
      )}
    >
      <div className="sidebar-brand flex items-center justify-between h-[76px] px-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl p-0.5 shrink-0 overflow-hidden border border-white/20">
            <img
              src="/vua_phe_logo2.jpg"
              alt="VUA PHẾ Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap leading-none">
                VUA PHẾ
              </span>
              <span className="text-[10px] font-medium tracking-[0.12em] text-[var(--brand-accent)] uppercase mt-1.5">
                Quản lý xưởng tái chế
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="sidebar-toggle p-1.5 rounded-lg border shadow-sm transition-all absolute -right-3 top-6"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav role="navigation" aria-label="Menu chính" className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {visibleMenuItems.map((item) => (
          <React.Fragment key={item.path}>
            {!collapsed && (item.id === 'dashboard' || item.id === 'finance' || item.id === 'contacts') && (
              <p className="sidebar-section-label">
                {item.id === 'dashboard' ? 'Vận hành' : item.id === 'finance' ? 'Quản trị' : 'Hệ thống'}
              </p>
            )}
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={() => {
                const isCurrent =
                  item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                return cn(
                  'sidebar-link flex items-center px-3.5 py-3 rounded-xl transition-all font-medium text-[13px] group relative',
                  isCurrent ? 'sidebar-link-active' : '',
                );
              }}
            >
              <item.icon
                className={cn(
                  'shrink-0 transition-transform group-hover:scale-110',
                  collapsed ? 'mx-auto' : 'mr-3',
                )}
                size={18}
              />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-workshop mx-4 mb-4 rounded-xl p-3">
          <Recycle size={16} />
          <div>
            <p className="text-xs font-semibold">Xưởng đang vận hành</p>
            <p className="text-[10px] mt-1">Nhập · Xay · Cân · Xuất</p>
          </div>
        </div>
      )}
      <div className="sidebar-footer p-4">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-white">{user?.name || 'Người dùng'}</p>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {user?.role === 'admin'
                  ? 'Quản trị viên'
                  : user?.role === 'manager'
                    ? 'Quản lý xưởng'
                    : 'Nhân viên'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
