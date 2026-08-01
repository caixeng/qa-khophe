import * as React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

const PATH_LABELS: Record<string, string> = {
  '/': 'Trang chủ',
  '/phe': 'Quản lý Phế',
  '/ton-kho': 'Tồn kho',
  '/tai-chinh': 'Tài chính',
  '/nhan-vien': 'Nhân sự',
  '/danh-ba': 'Danh bạ',
  '/bao-cao': 'Báo cáo',
  '/cai-dat': 'Cài đặt',
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);

  const breadcrumbs = [
    { path: '/', label: PATH_LABELS['/'] }
  ];

  let currentPath = '';
  paths.forEach(segment => {
    currentPath += `/${segment}`;
    if (PATH_LABELS[currentPath]) {
      breadcrumbs.push({ path: currentPath, label: PATH_LABELS[currentPath] });
    } else {
      breadcrumbs.push({ path: currentPath, label: segment });
    }
  });

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={crumb.path}>
            {index === 0 ? (
              isLast ? (
                <span className="text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                  <Home size={14} />
                  <span className="hidden sm:inline">{crumb.label}</span>
                </span>
              ) : (
                <Link to={crumb.path} className="text-[var(--text-muted)] hover:text-[var(--primary-500)] flex items-center gap-1.5 transition-colors">
                  <Home size={14} />
                  <span className="hidden sm:inline">{crumb.label}</span>
                </Link>
              )
            ) : (
              isLast ? (
                <span className="text-[var(--text-primary)] font-bold">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="text-[var(--text-muted)] hover:text-[var(--primary-500)] transition-colors">
                  {crumb.label}
                </Link>
              )
            )}
            
            {!isLast && (
              <ChevronRight size={12} className="text-[var(--text-muted)]" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
