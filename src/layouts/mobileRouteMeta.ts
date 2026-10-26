export interface MobileRouteMeta {
  /** Tiêu đề hiển thị trên thanh đầu trang điện thoại */
  title: string;
  /** Màn gốc của thanh điều hướng dưới (không cần nút quay lại) */
  isTabRoot: boolean;
  /** Có nút quay lại (màn con, hoặc màn không nằm trên thanh dưới) */
  showBack: boolean;
  /** Đường dẫn quay về khi không có lịch sử trình duyệt */
  parentPath: string;
}

/** Các đường dẫn gốc nằm trực tiếp trên thanh điều hướng dưới (MobileBottomNav) */
const TAB_ROOTS = new Set(['/', '/phe', '/ton-kho', '/tai-chinh', '/danh-ba']);

const ROOT_TITLES: Record<string, string> = {
  '/': 'VUA PHẾ',
  '/phe': 'Quản lý Phế',
  '/ton-kho': 'Tồn kho & Bao bì',
  '/tai-chinh': 'Tài chính & Công nợ',
  '/nhan-vien': 'Nhân sự & Lương',
  '/danh-ba': 'Danh bạ đối tác',
  '/doi-soat': 'Đối soát dữ liệu',
  '/bao-cao': 'Trung tâm báo cáo',
  '/cai-dat': 'Cài đặt hệ thống',
};

const DETAIL_TITLES: Record<string, string> = {
  '/danh-ba': 'Chi tiết đối tác',
};

const PHE_TAB_TITLES: Record<string, string> = {
  nhap: 'Nhập phế liệu',
  xay: 'Xay phế liệu',
  xuat: 'Xuất bán phế',
  can: 'Cân phế điện tử',
};

const TAI_CHINH_TAB_TITLES: Record<string, string> = {
  chiphi: 'Chi phí & Ứng tiền',
  congno: 'Quản lý Công nợ',
};

/** Suy ra tiêu đề và trạng thái nút quay lại của thanh MobileHeader từ URL hiện tại */
export function getMobileRouteMeta(pathname: string, search = ''): MobileRouteMeta {
  const segments = pathname.split('/').filter(Boolean);
  const rootPath = segments.length ? `/${segments[0]}` : '/';
  const isChild = segments.length > 1;
  const isTabRoot = !isChild && TAB_ROOTS.has(rootPath);

  let title = ROOT_TITLES[rootPath] ?? 'VUA PHẾ';

  if (isChild) {
    title = DETAIL_TITLES[rootPath] ?? title;
  } else if (search) {
    const params = new URLSearchParams(search);
    const tab = params.get('tab');
    if (rootPath === '/phe' && tab && PHE_TAB_TITLES[tab]) {
      title = PHE_TAB_TITLES[tab];
    } else if (rootPath === '/tai-chinh' && tab && TAI_CHINH_TAB_TITLES[tab]) {
      title = TAI_CHINH_TAB_TITLES[tab];
    }
  }

  return {
    title,
    isTabRoot,
    showBack: !isTabRoot && pathname !== '/',
    parentPath: isChild ? rootPath : '/',
  };
}
