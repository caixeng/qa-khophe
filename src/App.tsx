import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SlidePanelProvider } from './contexts/SlidePanelContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DanhBaPage } from './pages/DanhBaPage';
import { QuanLyPhePage } from './pages/QuanLyPhePage';
import { TaiChinhPage } from './pages/TaiChinhPage';
import { TonKhoPage } from './pages/TonKhoPage';
import { BaoCaoPage } from './pages/BaoCaoPage';
import { CaiDatPage } from './pages/CaiDatPage';

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SlidePanelProvider>
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
                
                {/* Consolidated Module: Tài chính */}
                <Route path="tai-chinh" element={<TaiChinhPage />} />
                
                <Route path="ton-kho" element={<TonKhoPage />} />
                <Route path="danh-ba" element={<DanhBaPage />} />
                <Route path="bao-cao" element={<BaoCaoPage />} />
                <Route path="cai-dat" element={<CaiDatPage />} />

                {/* Direct Subroute Redirects */}
                <Route path="nhap-phe" element={<Navigate to="/phe?tab=nhap" replace />} />
                <Route path="xay-phe" element={<Navigate to="/phe?tab=xay" replace />} />
                <Route path="xuat-phe" element={<Navigate to="/phe?tab=xuat" replace />} />
                <Route path="can-phe" element={<Navigate to="/phe?tab=can" replace />} />
                <Route path="chi-phi" element={<Navigate to="/tai-chinh?tab=chiphi" replace />} />
                <Route path="cong-no" element={<Navigate to="/tai-chinh?tab=congno" replace />} />
              </Route>
            </Routes>
          </SlidePanelProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
