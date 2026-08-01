import * as React from 'react';
import { useTheme, PRIMARY_COLORS, type Theme, type Density } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { User, Palette, Moon, Sun, Leaf, Check, Monitor, Sliders } from 'lucide-react';
import { cn, formatRole } from '../lib/utils';

export const CaiDatPage = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor, density, setDensity } = useTheme();
  const { user } = useAuth();

  const THEMES: { id: Theme; title: string; subtitle: string; icon: React.ElementType }[] = [
    { id: 'nature', title: 'Nature (Tự nhiên)', subtitle: 'Tông màu Kem & Cát ấm chuẩn CIC-IBST', icon: Leaf },
    { id: 'light', title: 'Light (Sáng)', subtitle: 'Giao diện nền trắng Slate hiện đại', icon: Sun },
    { id: 'dark', title: 'Dark (Tối)', subtitle: 'Chế độ tối dịu mắt cho ban đêm', icon: Moon },
  ];

  const DENSITIES: { id: Density; title: string; subtitle: string; badge: string }[] = [
    { id: 'comfortable', title: 'Thoải mái (100%)', subtitle: 'Khoảng cách rộng rãi, chữ to rõ nét', badge: 'Tiêu chuẩn' },
    { id: 'compact', title: 'Vừa phải (90%)', subtitle: 'Cân bằng tối ưu giữa khoảng trống và số liệu', badge: 'Khuyên dùng' },
    { id: 'dense', title: 'Thu nhỏ / Cao (80%)', subtitle: 'Mật độ dữ liệu cao, xem nhiều hàng cùng lúc', badge: 'Nhiều dữ liệu' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Cài Đặt Hệ Thống</h1>
        <p className="text-xs text-[var(--text-secondary)]">Cá nhân hóa giao diện, màu sắc chủ đạo và mật độ hiển thị theo nhu cầu làm việc</p>
      </div>

      {/* 1. Thông tin tài khoản */}
      <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <User size={16} className="text-[var(--primary-500)]" />
          Tài Khoản Hiện Tại
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white text-xl font-black shadow-md shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{user?.name || 'Người dùng'}</p>
            <p className="text-xs text-[var(--text-muted)]">{user?.email || '—'}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-500)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-500)]" />
              {formatRole(user?.role)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Giao diện - Chế độ nền (3 Themes) */}
      <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <Monitor size={16} className="text-[var(--primary-500)]" />
          1. Chế Độ Giao Diện (3 Themes)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col text-left p-4 rounded-xl border-2 transition-all relative group cursor-pointer",
                  isActive 
                    ? "border-[var(--primary-500)] bg-[var(--primary-50)]/40 shadow-sm" 
                    : "border-[var(--border-color)] bg-[var(--bg-subtle)]/30 hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isActive ? "bg-[var(--primary-500)] text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)]"
                  )}>
                    <Icon size={18} />
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-[var(--primary-500)] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm text-[var(--text-primary)]">{t.title}</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">{t.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Màu sắc chủ đạo (9 Primary Color Palettes) */}
      <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-2">
          <Palette size={16} className="text-[var(--primary-500)]" />
          2. Tông Màu Chủ Đạo (9 Palettes)
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Thay đổi gam màu nhấn cho nút bấm, bảng biểu, icon và liên kết trên toàn hệ thống</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRIMARY_COLORS.map((c) => {
            const isActive = primaryColor === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setPrimaryColor(c.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left cursor-pointer",
                  isActive
                    ? "border-[var(--primary-500)] bg-[var(--primary-50)]/40 shadow-xs"
                    : "border-[var(--border-color)] bg-[var(--bg-subtle)]/20 hover:bg-[var(--bg-subtle)]"
                )}
              >
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs transition-transform group-hover:scale-105"
                  style={{ backgroundColor: c.hex }}
                >
                  {isActive && <Check size={14} strokeWidth={3} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{c.hex}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mật độ hiển thị / Kích cỡ giao diện (Data Density) */}
      <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-2">
          <Sliders size={16} className="text-[var(--primary-500)]" />
          3. Kích Cỡ Giao Diện & Mật Độ Dữ Liệu (Data Density)
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Điều chỉnh khoảng cách hàng và cỡ chữ trong các bảng dữ liệu nhập/xuất kho</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DENSITIES.map((d) => {
            const isActive = density === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                className={cn(
                  "flex flex-col text-left p-4 rounded-xl border-2 transition-all relative cursor-pointer",
                  isActive
                    ? "border-[var(--primary-500)] bg-[var(--primary-50)]/40 shadow-sm"
                    : "border-[var(--border-color)] bg-[var(--bg-subtle)]/30 hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    isActive ? "bg-[var(--primary-500)] text-white border-transparent" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-color)]"
                  )}>
                    {d.badge}
                  </span>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-[var(--primary-500)] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="font-bold text-sm text-[var(--text-primary)] mt-1">{d.title}</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">{d.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
