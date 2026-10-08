import { useAuth } from '../contexts/auth';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Recycle, Package, Menu, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { MobileMoreMenuSheet } from '../components/mobile/MobileMoreMenuSheet';
import { MobileQuickActionModal } from '../components/mobile/MobileQuickActionModal';

export const MobileBottomNav = () => {
  const { user } = useAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Menu di động"
        className="mobile-nav-safe lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border-color)] flex justify-between items-start px-2 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      >
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95',
              isActive
                ? 'text-[var(--primary-600)] font-black'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium',
            )
          }
        >
          <Home size={20} />
          <span className="text-[11px] truncate">Trang chủ</span>
        </NavLink>

        <NavLink
          to={user?.role === 'accountant' ? '/tai-chinh' : '/phe'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95',
              isActive
                ? 'text-[var(--primary-600)] font-black'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium',
            )
          }
        >
          <Recycle size={20} />
          <span className="text-[11px] truncate">{user?.role === 'accountant' ? 'Tài chính' : 'QL Phế'}</span>
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
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95',
              isActive
                ? 'text-[var(--primary-600)] font-black'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium',
            )
          }
        >
          <Package size={20} />
          <span className="text-[11px] truncate">Tồn kho</span>
        </NavLink>

        <button
          onClick={() => setMoreMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium active:scale-95 cursor-pointer"
        >
          <Menu size={20} />
          <span className="text-xs truncate">Khác</span>
        </button>
      </nav>

      <MobileMoreMenuSheet isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
      <MobileQuickActionModal isOpen={quickActionOpen} onClose={() => setQuickActionOpen(false)} />
    </>
  );
};
