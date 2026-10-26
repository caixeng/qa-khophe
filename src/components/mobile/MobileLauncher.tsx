import * as React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  Settings2,
  ArrowUpFromLine,
  Scale,
  Package,
  Receipt,
  FileText,
  UserCheck,
  Users,
  BarChart2,
  BarChart3,
  Settings,
  Search,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  ChevronRight,
  Compass,
  LayoutGrid,
  Rows3,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth';
import type { PermissionKey } from '../../lib/permissions';
import { formatKg, formatNgay, formatRole, formatTien } from '../../lib/utils';
import type { DashboardSummary } from '../../services/reviewService';

interface MobileLauncherProps {
  summary: DashboardSummary;
  canSeeFinance: boolean;
  onSwitchToDashboard: () => void;
}

type ModuleCategory = 'production' | 'finance' | 'hr_system';

interface Module3DConfig {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  path: string;
  icon: React.ElementType;
  category: ModuleCategory;
  isFeaturedBento?: boolean;
  gradient: string;
  lipColor: string;
  glowRgba: string;
  badge?: string | number;
  badgeClass?: string;
  isHot?: boolean;
  keywords: string;
  permission?: PermissionKey;
}

const CATEGORY_LABELS: Record<'all' | ModuleCategory, string> = {
  all: 'Tất cả',
  production: 'Sản xuất & Kho',
  finance: 'Tài chính & Đối soát',
  hr_system: 'Nhân sự & Đối tác',
};

/** Chuẩn hóa chuỗi bỏ dấu Tiếng Việt để tìm kiếm thông minh */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const MobileLauncher: React.FC<MobileLauncherProps> = ({
  summary,
  canSeeFinance,
  onSwitchToDashboard,
}) => {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ModuleCategory>('all');
  const [layoutStyle, setLayoutStyle] = useState<'hybrid' | 'grid3' | 'bento2'>(() => {
    try {
      const saved = localStorage.getItem('khophe_mobile_launcher_layout');
      if (saved === 'hybrid' || saved === 'grid3' || saved === 'bento2') return saved;
    } catch {
      // Fallback mặc định
    }
    return 'hybrid';
  });

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  };

  const handleLayoutChange = (next: 'hybrid' | 'grid3' | 'bento2') => {
    triggerHaptic();
    setLayoutStyle(next);
    try {
      localStorage.setItem('khophe_mobile_launcher_layout', next);
    } catch {
      // Ignore storage error
    }
  };

  const canViewScrap = can('scrap.view');
  const prioritizeFinanceBento = !canViewScrap && can('finance.view');

  const alertCount =
    (summary.pendingImportCount > 0 ? summary.pendingImportCount : 0) +
    (summary.overdueCount > 0 ? summary.overdueCount : 0) +
    (summary.lowStockAlert ? 1 : 0);

  const allModules: Module3DConfig[] = useMemo(() => {
    return [
      // ── NHÓM: SẢN XUẤT & KHO (4 Phân hệ Trọng tâm lên Bento) ──
      {
        id: 'nhap-phe',
        name: 'Nhập phế liệu',
        shortName: 'Nhập phế',
        desc: 'Thu mua phế thô, cân & theo dõi lô nhập',
        path: '/phe?tab=nhap',
        icon: ArrowDownToLine,
        category: 'production',
        isFeaturedBento: canViewScrap,
        gradient: 'from-blue-500 via-blue-600 to-cyan-600',
        lipColor: '#1e40af',
        glowRgba: 'rgba(37, 99, 235, 0.5)',
        badge:
          summary.todayImportKg > 0
            ? formatKg(summary.todayImportKg)
            : summary.pendingImportCount > 0
              ? `${summary.pendingImportCount} lô`
              : 'Mới',
        badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
        isHot: true,
        keywords: 'nhap phe mua phe phieu nhap lo hang thu mua',
        permission: 'scrap.view',
      },
      {
        id: 'xay-phe',
        name: 'Xay & Chế biến',
        shortName: 'Xay phế',
        desc: 'Vận hành ca xay, đóng bao & trừ hao hụt',
        path: '/phe?tab=xay',
        icon: Settings2,
        category: 'production',
        isFeaturedBento: canViewScrap,
        gradient: 'from-purple-500 via-violet-600 to-indigo-700',
        lipColor: '#4c1d95',
        glowRgba: 'rgba(124, 58, 237, 0.5)',
        badge:
          summary.pendingImportCount > 0
            ? `${summary.pendingImportCount} chờ xay`
            : summary.todayGroundKg > 0
              ? formatKg(summary.todayGroundKg)
              : undefined,
        badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        isHot: summary.pendingImportCount > 0,
        keywords: 'xay phe ca xay che bien hao hut dong bao',
        permission: 'scrap.view',
      },
      {
        id: 'xuat-phe',
        name: 'Xuất bán phế',
        shortName: 'Xuất phế',
        desc: 'Phiếu xuất thành phẩm, giao hàng & doanh thu',
        path: '/phe?tab=xuat',
        icon: ArrowUpFromLine,
        category: 'production',
        isFeaturedBento: canViewScrap,
        gradient: 'from-amber-500 via-orange-500 to-red-600',
        lipColor: '#9a3412',
        glowRgba: 'rgba(245, 158, 11, 0.5)',
        badge: summary.todayExportBags > 0 ? `${summary.todayExportBags} bao` : undefined,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        keywords: 'xuat phe ban hang thanh pham giao hang khach mua',
        permission: 'scrap.view',
      },
      {
        id: 'ton-kho',
        name: 'Tồn kho & Bao bì',
        shortName: 'Tồn kho',
        desc: 'Kiểm kê phế thô, thành phẩm & cảnh báo tồn',
        path: '/ton-kho',
        icon: Package,
        category: 'production',
        isFeaturedBento: true,
        gradient: 'from-sky-400 via-blue-500 to-indigo-600',
        lipColor: '#1e3a8a',
        glowRgba: 'rgba(14, 165, 233, 0.5)',
        badge: `${summary.inventoryBags} bao`,
        badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        isHot: summary.lowStockAlert,
        keywords: 'ton kho bao bi kiem ke kho bai thanh pham',
        permission: 'inventory.view',
      },

      // ── CÁC PHÂN HỆ NGHIỆP VỤ CÒN LẠI ──
      {
        id: 'can-phe',
        name: 'Cân phế điện tử',
        shortName: 'Cân phế',
        desc: 'Ghi mã cân, trừ bì pallet & cộng dồn tự động',
        path: '/phe?tab=can',
        icon: Scale,
        category: 'production',
        gradient: 'from-emerald-500 via-teal-600 to-green-700',
        lipColor: '#065f46',
        glowRgba: 'rgba(16, 185, 129, 0.45)',
        keywords: 'can phe dien tu ma can tru bi pallet',
        permission: 'scrap.view',
      },
      {
        id: 'chi-phi',
        name: 'Chi phí & Ứng tiền',
        shortName: 'Chi phí',
        desc: 'Điện, vận chuyển, vật tư & tạm ứng nhân công',
        path: '/tai-chinh?tab=chiphi',
        icon: Receipt,
        category: 'finance',
        isFeaturedBento: prioritizeFinanceBento,
        gradient: 'from-indigo-500 via-violet-500 to-purple-600',
        lipColor: '#3730a3',
        glowRgba: 'rgba(99, 102, 241, 0.45)',
        keywords: 'chi phi tai chinh ung tien dien nuoc van chuyen',
        permission: 'finance.view',
      },
      {
        id: 'cong-no',
        name: 'Công nợ Thu / Trả',
        shortName: 'Công nợ',
        desc: 'Theo dõi phải thu khách hàng & phải trả NCC',
        path: '/tai-chinh?tab=congno',
        icon: FileText,
        category: 'finance',
        isFeaturedBento: prioritizeFinanceBento,
        gradient: 'from-rose-500 via-red-600 to-orange-600',
        lipColor: '#991b1b',
        glowRgba: 'rgba(225, 29, 72, 0.5)',
        badge: summary.overdueCount > 0 ? `${summary.overdueCount} quá hạn` : undefined,
        badgeClass: 'bg-rose-500 text-white border-rose-300',
        isHot: summary.overdueCount > 0,
        keywords: 'cong no phai thu phai tra khach no thanh toan',
        permission: 'finance.view',
      },
      {
        id: 'doi-soat',
        name: 'Đối soát dữ liệu',
        shortName: 'Đối soát',
        desc: 'Kiểm tra chéo tồn kho, hao hụt & tạm ứng',
        path: '/doi-soat',
        icon: BarChart3,
        category: 'finance',
        isFeaturedBento: prioritizeFinanceBento,
        gradient: 'from-cyan-500 via-teal-500 to-blue-600',
        lipColor: '#155e75',
        glowRgba: 'rgba(6, 182, 212, 0.45)',
        keywords: 'doi soat du lieu kiem tra lech kho hao hut',
        permission: 'reconciliation.view',
      },
      {
        id: 'bao-cao',
        name: 'Trung tâm Báo cáo',
        shortName: 'Báo cáo',
        desc: 'Thống kê lãi lỗ, sản lượng & xuất Excel',
        path: '/bao-cao',
        icon: BarChart2,
        category: 'finance',
        gradient: 'from-fuchsia-500 via-pink-600 to-rose-600',
        lipColor: '#86198f',
        glowRgba: 'rgba(217, 70, 239, 0.45)',
        keywords: 'trung tam bao cao thong ke xuat excel doanh thu lai lo',
        permission: 'reports.view',
      },
      {
        id: 'nhan-vien',
        name: 'Nhân sự & Lương',
        shortName: 'Nhân sự',
        desc: 'Chấm công hàng ngày, ứng lương & bảng lương',
        path: '/nhan-vien',
        icon: UserCheck,
        category: 'hr_system',
        gradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
        lipColor: '#5b21b6',
        glowRgba: 'rgba(139, 92, 246, 0.45)',
        keywords: 'nhan su nhan vien cham cong bang luong ung luong',
        permission: 'hr.view',
      },
      {
        id: 'danh-ba',
        name: 'Danh bạ đối tác',
        shortName: 'Đối tác',
        desc: 'Nhà cung cấp phế liệu & khách mua thành phẩm',
        path: '/danh-ba',
        icon: Users,
        category: 'hr_system',
        gradient: 'from-teal-500 via-emerald-600 to-cyan-700',
        lipColor: '#115e59',
        glowRgba: 'rgba(20, 184, 166, 0.45)',
        keywords: 'danh ba doi tac khach hang nha cung cap vua phe',
        permission: 'contacts.view',
      },
      {
        id: 'cai-dat',
        name: 'Cài đặt hệ thống',
        shortName: 'Cài đặt',
        desc: 'Cấu hình thông số xưởng & phân quyền tài khoản',
        path: '/cai-dat',
        icon: Settings,
        category: 'hr_system',
        gradient: 'from-slate-600 via-slate-700 to-blue-900',
        lipColor: '#1e293b',
        glowRgba: 'rgba(71, 85, 105, 0.48)',
        keywords: 'cai dat he thong tai khoan phan quyen cau hinh',
        permission: 'settings.manage',
      },
    ];
  }, [canViewScrap, prioritizeFinanceBento, summary]);

  const visibleModules = useMemo(() => {
    return allModules.filter((m) => {
      if (m.permission && !can(m.permission)) return false;
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = removeVietnameseTones(searchQuery.trim());
        const target = removeVietnameseTones(`${m.name} ${m.shortName} ${m.desc} ${m.keywords}`);
        return target.includes(q);
      }
      return true;
    });
  }, [allModules, can, selectedCategory, searchQuery]);

  const isDefaultView = selectedCategory === 'all' && !searchQuery.trim();

  const featuredBentoModules = useMemo(() => {
    if (layoutStyle !== 'hybrid' || !isDefaultView) return [];
    return visibleModules.filter((m) => m.isFeaturedBento);
  }, [layoutStyle, isDefaultView, visibleModules]);

  const remainingGridModules = useMemo(() => {
    if (layoutStyle === 'hybrid' && isDefaultView) {
      return visibleModules.filter((m) => !m.isFeaturedBento);
    }
    return visibleModules;
  }, [layoutStyle, isDefaultView, visibleModules]);

  const handleLaunch = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  /** Render Khối Icon 3D Tactile Squircle chuẩn Spatial UI (đồng bộ qlda-ddcn-ht-selfhost) */
  const render3DSquircleIcon = (module: Module3DConfig, size: 'md' | 'lg' = 'lg') => {
    const Icon = module.icon;
    const sizeClasses = size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
    const iconSizeClasses = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

    return (
      <div className="relative inline-flex items-center justify-center shrink-0">
        {/* Glow phát sáng dưới đáy icon */}
        <div
          className="absolute -bottom-1.5 inset-x-1.5 h-4 rounded-full blur-md opacity-75 dark:opacity-90 pointer-events-none transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: module.glowRgba }}
        />

        {/* Thân khối 3D có cạnh dày (3D Extrusion Lip) */}
        <div
          className={`relative ${sizeClasses} flex items-center justify-center bg-gradient-to-br ${module.gradient} transition-transform duration-200 group-active:translate-y-0.5`}
          style={{
            boxShadow: `
              0 4px 0 0 ${module.lipColor},
              0 10px 20px -4px ${module.glowRgba},
              inset 0 2px 3px 0 rgba(255, 255, 255, 0.65),
              inset 0 -3px 5px 0 rgba(0, 0, 0, 0.28)
            `,
          }}
        >
          {/* Lớp vát phản quang chéo (Specular Glossy Sheen) */}
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[120%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rotate-[-18deg] transform pointer-events-none" />
          </div>

          {/* Điểm sáng góc trên trái */}
          <div className="absolute top-1.5 left-2 w-3 h-1 rounded-full bg-white/45 blur-[0.5px] pointer-events-none" />

          {/* Biểu tượng SVG nổi khối Z-depth */}
          <Icon
            className={`${iconSizeClasses} text-white relative z-10 drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]`}
            strokeWidth={2.2}
          />
        </div>

        {/* Chấm đèn báo nóng (Hot Indicator) */}
        {module.isHot && !module.badge && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border-2 border-white dark:border-slate-900" />
          </span>
        )}

        {/* Huy hiệu số liệu nổi góc trên phải khi ở chế độ Lưới 3 cột */}
        {module.badge && size === 'lg' && (
          <span className="absolute -top-2 -right-2.5 z-20 px-1.5 py-0.5 min-w-[1.35rem] text-center rounded-full text-[10px] font-extrabold leading-none bg-rose-600 text-white border-2 border-white dark:border-slate-900 shadow-md">
            {module.badge}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[82vh] -mx-3 -mt-3 pb-6 px-3 pt-3 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 font-sans select-none">
      {/* ── KHU VỰC 1: THẺ HERO 3D THÔNG MINH ── */}
      <div className="relative overflow-hidden rounded-3xl p-3.5 mb-3 border border-white/40 dark:border-white/15 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-[0_12px_26px_-8px_rgba(30,58,138,0.45)] animate-fade-in">
        {/* Quầng sáng không gian 3D (Spatial Ambient Orbs) */}
        <div className="absolute -top-14 -right-10 w-44 h-44 bg-cyan-400/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Hàng trên: Lời chào + Nút chuyển qua Biểu đồ Số liệu */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wider uppercase bg-white/15 text-cyan-200 backdrop-blur-md border border-white/20 mb-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
              <span>Cổng Điều Hành Số 3D</span>
            </div>
            <h1 className="text-base font-extrabold tracking-tight text-white truncate">
              Xin chào, {user?.name || 'Quản lý Xưởng'}!
            </h1>
            <p className="text-[11px] text-blue-200/85 font-medium truncate">
              {formatNgay(new Date())} • {formatRole(user?.role)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onSwitchToDashboard();
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 active:scale-95 backdrop-blur-md border border-cyan-300/40 text-[11px] font-bold text-white shadow-md transition-all cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-200" />
            <span>Biểu đồ</span>
            <ChevronRight className="w-3 h-3 opacity-80" />
          </button>
        </div>

        {/* Hàng dưới: 3 Thẻ KPI Mini trong suốt (Glass Pills) */}
        <div className="relative z-10 grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleLaunch('/ton-kho')}
            className="text-left bg-white/10 active:bg-white/20 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/15 transition-colors cursor-pointer"
          >
            <span className="block text-[9.5px] uppercase font-bold text-blue-200/80 tracking-wide truncate">
              Tồn kho phế
            </span>
            <span className="text-xs font-black tracking-tight text-white truncate block">
              {summary.inventoryBags} bao
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLaunch(canSeeFinance ? '/tai-chinh' : '/phe')}
            className="text-left bg-white/10 active:bg-white/20 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/15 transition-colors cursor-pointer"
          >
            <span className="block text-[9.5px] uppercase font-bold text-emerald-200/80 tracking-wide truncate">
              {canSeeFinance ? 'Doanh thu' : 'Nhập hôm nay'}
            </span>
            <span className="text-xs font-black tracking-tight text-emerald-300 truncate block">
              {canSeeFinance ? formatTien(summary.totalRevenue) : formatKg(summary.todayImportKg)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLaunch('/doi-soat')}
            className="text-left bg-white/10 active:bg-white/20 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/15 transition-colors cursor-pointer"
          >
            <span className="block text-[9.5px] uppercase font-bold text-rose-200/80 tracking-wide truncate">
              Cảnh báo
            </span>
            <span className="text-xs font-black tracking-tight text-rose-300 truncate block">
              {alertCount} mục
            </span>
          </button>
        </div>
      </div>

      {/* ── KHU VỰC 2: THANH TÌM KIẾM & BỘ LỌC NHÓM ── */}
      <div className="sticky top-0 z-30 mb-3 space-y-1.5 pt-1 pb-1.5 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl -mx-3 px-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh phân hệ (vd: nhập phế, cân, công nợ)..."
              className="w-full h-9 pl-8 pr-7 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa"
                className="absolute right-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full w-4.5 h-4.5 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nút chuyển đổi kiểu bố cục (Kết hợp / Lưới 3 cột / Thẻ 2 cột) */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => handleLayoutChange('hybrid')}
              title="Bố cục Kết hợp (4 Thẻ lớn + Lưới Icon 3D)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutStyle === 'hybrid'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('grid3')}
              title="Bố cục Lưới 3 cột Icon 3D"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutStyle === 'grid3'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('bento2')}
              title="Bố cục Thẻ 2 cột kèm mô tả"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutStyle === 'bento2'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Thanh Filter Chips phân nhóm */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(['all', 'production', 'finance', 'hr_system'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                triggerHaptic();
                setSelectedCategory(cat);
              }}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm shadow-slate-900/20'
                  : 'bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KHU VỰC 3: LỐI TẮT ĐỐI SOÁT & ĐIỀU HÀNH NHANH (Khi xem Mặc định) ── */}
      {isDefaultView && (
        <>
          <button
            type="button"
            onClick={() => handleLaunch('/doi-soat')}
            className="mb-2 flex w-full items-center gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 p-2.5 text-left shadow-2xs active:scale-[0.98] transition-transform cursor-pointer dark:border-amber-800/60 dark:from-amber-500/15 dark:to-rose-500/15"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/30">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">
                Việc cần kiểm tra &amp; Đối soát
              </div>
              <div className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {summary.pendingImportCount} lô chờ xay · Hao hụt · Tạm ứng nhân sự
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                onSwitchToDashboard();
              }}
              className="flex items-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-cyan-500/10 dark:from-blue-500/15 dark:to-indigo-500/15 border border-blue-200/80 dark:border-blue-800/60 text-left shadow-2xs active:scale-[0.97] transition-transform cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-blue-900 flex items-center justify-center text-white shadow-sm shadow-blue-900/25 shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  Giao ban tháng
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Biểu đồ &amp; sản lượng
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLaunch(!canViewScrap ? '/bao-cao' : '/phe?tab=can')}
              className="flex items-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-purple-600/10 via-fuchsia-500/10 to-pink-500/10 dark:from-purple-500/15 dark:to-pink-500/15 border border-purple-200/80 dark:border-purple-800/60 text-left shadow-2xs active:scale-[0.97] transition-transform cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/30 shrink-0">
                {!canViewScrap ? <BarChart2 className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {!canViewScrap ? 'Báo cáo lãi lỗ' : 'Cân điện tử'}
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {!canViewScrap ? 'Xuất biểu mẫu Excel' : 'Phiên cân nhanh'}
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── KHU VỰC 4A: 4 PHÂN HỆ TRỌNG TÂM DẠNG THẺ BENTO 3D (Chế độ Hybrid) ── */}
      {featuredBentoModules.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Phân hệ trọng tâm
            </span>
            <span className="text-[10.5px] font-semibold text-blue-700 dark:text-blue-400">
              Truy cập nhanh
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {featuredBentoModules.map((module) => (
              <div
                key={module.id}
                onClick={() => handleLaunch(module.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLaunch(module.path);
                  }
                }}
                className="group relative cursor-pointer active:scale-[0.96] transition-transform"
              >
                <div className="relative h-full p-3 rounded-2xl bg-white/95 dark:bg-slate-900 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.45)] overflow-hidden transition-all">
                  {/* Vệt sáng phản quang cạnh trên */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white dark:via-white/25 to-transparent" />

                  {/* Quầng màu 3D góc phải trên */}
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl opacity-25 dark:opacity-35 pointer-events-none"
                    style={{ backgroundColor: module.glowRgba }}
                  />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    {render3DSquircleIcon(module, 'md')}

                    {module.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border backdrop-blur-md ${
                          module.badgeClass ||
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {module.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {module.name}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                    {module.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KHU VỰC 4B: DANH SÁCH CÁC PHÂN HỆ (Lưới 3 Cột Icon 3D hoặc Thẻ 2 Cột) ── */}
      {remainingGridModules.length > 0 && (
        <div>
          {featuredBentoModules.length > 0 && (
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tất cả phân hệ nghiệp vụ
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {remainingGridModules.length} phân hệ
              </span>
            </div>
          )}

          {layoutStyle === 'bento2' ? (
            /* Chế độ Thẻ Bento 2 Cột kèm mô tả */
            <div className="grid grid-cols-2 gap-3">
              {remainingGridModules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => handleLaunch(module.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLaunch(module.path);
                    }
                  }}
                  className="group relative cursor-pointer active:scale-[0.96] transition-transform"
                >
                  <div className="relative h-full p-3.5 rounded-[1.5rem] bg-white/95 dark:bg-slate-900 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.07)] dark:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.4)] overflow-hidden">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      {render3DSquircleIcon(module, 'md')}
                      {module.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            module.badgeClass ||
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {module.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight truncate">
                        {module.name}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                      {module.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Chế độ Lưới 3 Cột Biểu Tượng 3D Nổi Khối (iOS / VisionOS Spatial App Grid) */
            <div className="p-3.5 rounded-[1.75rem] bg-white/85 dark:bg-slate-900 backdrop-blur-xl border border-white/80 dark:border-slate-800/90 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.07)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)]">
              <div className="grid grid-cols-3 gap-y-5 gap-x-2">
                {remainingGridModules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => handleLaunch(module.path)}
                    className="group flex flex-col items-center text-center focus:outline-none active:scale-90 transition-transform cursor-pointer"
                  >
                    <div className="mb-2">{render3DSquircleIcon(module, 'lg')}</div>
                    <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 px-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.shortName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trạng thái rỗng khi tìm kiếm không khớp */}
      {visibleModules.length === 0 && (
        <div className="text-center py-10 px-4 rounded-3xl bg-white/80 dark:bg-slate-900 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 mt-2">
          <Compass className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Không tìm thấy phân hệ phù hợp
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Thử tìm với từ khóa khác hoặc hiển thị lại toàn bộ danh mục.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Hiện tất cả phân hệ
          </button>
        </div>
      )}

      {/* ── CHÂN TRANG: CHUYỂN NHANH SANG DASHBOARD SỐ LIỆU ── */}
      <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/80 to-cyan-50/80 dark:from-slate-900 dark:via-slate-800/90 dark:to-slate-900 border border-blue-200/70 dark:border-slate-700/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
              Bảng biểu đồ &amp; Số liệu tổng hợp
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {canSeeFinance
                ? `Tổng doanh thu: ${formatTien(summary.totalRevenue)}`
                : `Tổng sản lượng nhập: ${formatKg(summary.totalImportKg)}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onSwitchToDashboard();
          }}
          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
        >
          Mở biểu đồ
        </button>
      </div>
    </div>
  );
};

export default MobileLauncher;
