import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
        'hidden lg:flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-color)] transition-all duration-300 z-20 shadow-sm relative',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-500)] p-0.5 shadow-md shrink-0 overflow-hidden ring-1 ring-[var(--primary-400)]/30">
            <img
              src="/vua_phe_logo2.jpg"
              alt="VUA PHẾ Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-lg tracking-tight text-[var(--primary-500)] whitespace-nowrap leading-none">
                VUA PHẾ
              </span>
              <span className="text-[11px] font-extrabold tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
                Tái chế & Quản lý Xưởng
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="p-1.5 hover:bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm transition-all absolute -right-3 top-5"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav
        role="navigation"
        aria-label="Menu chính"
        className="flex-1 overflow-y-auto py-4 px-2 space-y-1.5"
      >
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={() => {
              const isCurrent =
                item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return cn(
                'flex items-center px-3.5 py-3 rounded-xl transition-all font-bold text-[13px] group relative',
                isCurrent
                  ? 'bg-[var(--primary-50)] text-[var(--primary-600)] shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]',
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
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/50">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-full bg-[var(--primary-500)] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {user?.name?.charAt(0) || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate text-[var(--text-primary)]">
                {user?.name || 'Người dùng'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{user?.email || '—'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
