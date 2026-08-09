import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/auth';
import { SlidePanelProvider } from './contexts/SlidePanelContext';
import { AppLayout } from './layouts/AppLayout';
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const DanhBaPage = React.lazy(() => import('./pages/DanhBaPage').then((m) => ({ default: m.DanhBaPage })));
const QuanLyPhePage = React.lazy(() =>
  import('./pages/QuanLyPhePage').then((m) => ({ default: m.QuanLyPhePage })),
);
const TaiChinhPage = React.lazy(() =>
  import('./pages/TaiChinhPage').then((m) => ({ default: m.TaiChinhPage })),
);
const TonKhoPage = React.lazy(() => import('./pages/TonKhoPage').then((m) => ({ default: m.TonKhoPage })));
const NhanVienPage = React.lazy(() =>
  import('./pages/NhanVienPage').then((m) => ({ default: m.NhanVienPage })),
);
const BaoCaoPage = React.lazy(() => import('./pages/BaoCaoPage').then((m) => ({ default: m.BaoCaoPage })));
const CaiDatPage = React.lazy(() => import('./pages/CaiDatPage').then((m) => ({ default: m.CaiDatPage })));
const DoiTacChiTietPage = React.lazy(() =>
  import('./pages/DoiTacChiTietPage').then((m) => ({ default: m.DoiTacChiTietPage })),
);
const NotFoundPage = React.lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
import { ErrorBoundary } from './components/ErrorBoundary';
import { RequireRole } from './components/RequireRole';
import { PwaStatus } from './components/PwaStatus';

const LoadingScreen = () => (
  <div className="app-viewport flex flex-col items-center justify-center bg-[var(--bg-app)] text-[var(--primary-500)]">
    <div className="relative flex items-center justify-center w-20 h-20 mb-4 p-0.5 rounded-2xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] shadow-lg ring-2 ring-[var(--primary-400)]/30 overflow-hidden">
      <img src="/vua_phe_logo2.jpg" alt="VUA PHẾ Logo" className="w-full h-full object-cover rounded-xl" />
    </div>
    <h2 className="text-xl font-black tracking-tight text-[var(--primary-500)]">VUA PHẾ</h2>
    <p className="text-sm font-semibold text-[var(--text-muted)] mt-1 animate-pulse">
      Đang tải dữ liệu xưởng...
    </p>
  </div>
);

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <PwaStatus />
          <ThemeProvider>
            <AuthProvider>
              <SlidePanelProvider>
                <React.Suspense
                  fallback={
                    <div className="app-viewport flex items-center justify-center bg-[var(--bg-app)]">
                      <div className="w-8 h-8 rounded-full border-4 border-[var(--primary-500)] border-t-transparent animate-spin"></div>
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route
                      path="/"
                      element={
                        <RequireAuth>
                          <AppLayout />
                        </RequireAuth>
                      }
                    >
                      <Route index element={<DashboardPage />} />

                      {/* Consolidated Module: Quản lý Phế */}
                      <Route path="phe" element={<QuanLyPhePage />} />

                      {/* Consolidated Module: Tài chính — chi phí, ứng lương, công nợ */}
                      <Route
                        path="tai-chinh"
                        element={
                          <RequireRole allow={['manager', 'admin']}>
                            <TaiChinhPage />
                          </RequireRole>
                        }
                      />

                      <Route path="ton-kho" element={<TonKhoPage />} />
                      <Route
                        path="nhan-vien"
                        element={
                          <RequireRole allow={['manager', 'admin']}>
                            <NhanVienPage />
                          </RequireRole>
                        }
                      />
                      <Route path="danh-ba" element={<DanhBaPage />} />
                      <Route path="danh-ba/:id" element={<DoiTacChiTietPage />} />
                      <Route path="bao-cao" element={<BaoCaoPage />} />
                      <Route
                        path="cai-dat"
                        element={
                          <RequireRole allow={['admin']}>
                            <CaiDatPage />
                          </RequireRole>
                        }
                      />

                      {/* Direct Subroute Redirects */}
                      <Route path="nhap-phe" element={<Navigate to="/phe?tab=nhap" replace />} />
                      <Route path="xay-phe" element={<Navigate to="/phe?tab=xay" replace />} />
                      <Route path="xuat-phe" element={<Navigate to="/phe?tab=xuat" replace />} />
                      <Route path="can-phe" element={<Navigate to="/phe?tab=can" replace />} />
                      <Route path="chi-phi" element={<Navigate to="/tai-chinh?tab=chiphi" replace />} />
                      <Route path="cong-no" element={<Navigate to="/tai-chinh?tab=congno" replace />} />
                    </Route>

                    {/* Catch-all route for 404 Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </React.Suspense>
              </SlidePanelProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
