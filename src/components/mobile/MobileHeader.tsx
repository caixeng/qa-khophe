import * as React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Bell, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getMobileRouteMeta } from '../../layouts/mobileRouteMeta';
import { UserProfilePopover } from '../../layouts/UserProfilePopover';
import { MobileBottomSheet } from './MobileBottomSheet';
import { reviewService } from '../../services/reviewService';
import { formatKg, formatTien } from '../../lib/utils';

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenSearch }) => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === '/';
  const meta = getMobileRouteMeta(pathname, search);

  const [alertSheetOpen, setAlertSheetOpen] = useState(false);
  const [alertSummary, setAlertSummary] = useState<{
    pendingImportCount: number;
    overdueCount: number;
    totalOverdueReceivables: number;
    totalUnpaidReceivables: number;
    lowStockAlert: boolean;
    inventoryKg: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    reviewService
      .getDashboard()
      .then((res) => {
        if (!mounted || !res?.summary) return;
        setAlertSummary({
          pendingImportCount: res.summary.pendingImportCount || 0,
          overdueCount: res.summary.overdueCount || 0,
          totalOverdueReceivables: res.summary.totalOverdueReceivables || 0,
          totalUnpaidReceivables: res.summary.totalUnpaidReceivables || 0,
          lowStockAlert: Boolean(res.summary.lowStockAlert),
          inventoryKg: res.summary.inventoryKg || 0,
        });
      })
      .catch(() => {
        // Bỏ qua lỗi ngầm trên header
      });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Đồng bộ màu thanh trạng thái điện thoại với màu header (--brand-sidebar)
  useEffect(() => {
    const color =
      getComputedStyle(document.documentElement).getPropertyValue('--brand-sidebar').trim() || '#0e2633';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) return;
    const prev = metaTheme.getAttribute('content');
    metaTheme.setAttribute('content', color);
    return () => {
      if (prev) metaTheme.setAttribute('content', prev);
    };
  }, []);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(meta.parentPath);
    }
  };

  const totalAlerts = alertSummary
    ? (alertSummary.pendingImportCount > 0 ? 1 : 0) +
      (alertSummary.overdueCount > 0 ? 1 : 0) +
      (alertSummary.totalUnpaidReceivables > 0 ? 1 : 0) +
      (alertSummary.lowStockAlert ? 1 : 0)
    : 0;

  return (
    <>
      <header className="lg:hidden shrink-0 bg-[var(--brand-sidebar)] text-white sticky top-0 z-40 transition-colors duration-200 border-b border-white/10 shadow-md">
        <div className="h-14 flex items-center justify-between pl-3.5 pr-2">
          {/* Trái: Trang chủ = Logo & Tên hệ thống; Màn khác = Nút quay lại + Tên màn */}
          {isHome ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-white rounded-lg p-0.5 flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20 overflow-hidden">
                <img
                  src="/vua_phe_logo2.jpg"
                  alt="VUA PHẾ Logo"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[0.8125rem] font-extrabold text-[#ead3a5] uppercase leading-tight tracking-wide">
                  BAN QLSX VUA PHẾ
                </span>
                <span className="truncate text-[0.6875rem] font-medium text-white/75 leading-tight">
                  Hệ thống quản lý kho &amp; tái chế
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center min-w-0 -ml-1.5">
              {meta.showBack && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Quay lại"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/90 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h1
                className={`truncate text-[1rem] font-extrabold leading-tight text-white ${
                  meta.showBack ? 'pl-0.5' : 'pl-2'
                }`}
              >
                {meta.title}
              </h1>
            </div>
          )}

          {/* Phải: Tìm kiếm, Chuông cảnh báo, Hồ sơ cá nhân */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Tìm kiếm toàn hệ thống"
              className="flex h-10 w-10 items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Search size={19} />
            </button>

            <button
              type="button"
              onClick={() => setAlertSheetOpen(true)}
              aria-label="Thông báo & Cảnh báo"
              className="relative flex h-10 w-10 items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Bell size={19} />
              {totalAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black leading-4 text-center ring-2 ring-[var(--brand-sidebar)]">
                  {totalAlerts}
                </span>
              )}
            </button>

            <div className="[&_button]:text-white [&_button:hover]:bg-white/10">
              <UserProfilePopover />
            </div>
          </div>
        </div>
      </header>

      {/* Sheet Cảnh báo & Nhắc việc nhanh */}
      <MobileBottomSheet
        isOpen={alertSheetOpen}
        onClose={() => setAlertSheetOpen(false)}
        title="Trung tâm Cảnh báo & Nhắc việc"
      >
        <div className="space-y-3 pb-3">
          {totalAlerts === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-100">
                  Hệ thống vận hành ổn định
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Hiện không có lô tồn đọng hay công nợ quá hạn cần xử lý gấp.
                </p>
              </div>
            </div>
          ) : (
            <>
              {alertSummary && alertSummary.pendingImportCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertSheetOpen(false);
                    navigate('/phe?tab=xay');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-amber-900 dark:text-amber-100">
                        {alertSummary.pendingImportCount} lô phế chờ đưa vào xay
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Chạm để mở phân hệ Xay phế và tạo ca sản xuất
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                </button>
              )}

              {alertSummary && alertSummary.overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertSheetOpen(false);
                    navigate('/tai-chinh?tab=congno');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-rose-900 dark:text-rose-100">
                        {alertSummary.overdueCount} khoản nợ quá hạn (
                        {formatTien(alertSummary.totalOverdueReceivables)})
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                        Chạm để kiểm tra công nợ và thu hồi thanh toán
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-600 shrink-0" />
                </button>
              )}

              {alertSummary && alertSummary.totalUnpaidReceivables > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertSheetOpen(false);
                    navigate('/tai-chinh?tab=congno');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-blue-900 dark:text-blue-100">
                        Tổng phải thu khách hàng: {formatTien(alertSummary.totalUnpaidReceivables)}
                      </p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                        Theo dõi chi tiết các đợt xuất hàng chưa tất toán
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                </button>
              )}

              {alertSummary && alertSummary.lowStockAlert && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertSheetOpen(false);
                    navigate('/ton-kho');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-amber-900 dark:text-amber-100">
                        Cảnh báo tồn kho thấp ({formatKg(alertSummary.inventoryKg)})
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Kiểm tra tồn kho hiện tại và lập kế hoạch nhập phế
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setAlertSheetOpen(false);
              navigate('/doi-soat');
            }}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-[var(--primary-500)] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <span>Mở Bảng Đối Soát Dữ Liệu Toàn Xưởng</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </MobileBottomSheet>
    </>
  );
};
