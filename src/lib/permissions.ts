import type { UserRole } from '../types';

export type PermissionKey =
  | 'dashboard.finance.view'
  | 'reconciliation.view'
  | 'reports.view'
  | 'scrap.view'
  | 'scrap.create'
  | 'scrap.edit_delete'
  | 'inventory.view'
  | 'inventory.count'
  | 'inventory.opening_stock'
  | 'contacts.view'
  | 'contacts.manage'
  | 'finance.view'
  | 'finance.manage_expenses'
  | 'finance.record_payment'
  | 'attachments.delete'
  | 'hr.view'
  | 'hr.manage'
  | 'settings.manage';

export type PermissionMap = Record<PermissionKey, boolean>;

export interface PermissionItemMeta {
  key: PermissionKey;
  label: string;
  description: string;
  adminLocked?: boolean;
}

export interface PermissionGroupMeta {
  id: string;
  title: string;
  subtitle: string;
  items: PermissionItemMeta[];
}

export const PERMISSION_GROUPS: PermissionGroupMeta[] = [
  {
    id: 'dashboard_reports',
    title: '1. Tổng quan & Báo cáo',
    subtitle: 'Quyền xem chỉ số doanh thu, lợi nhuận, đối soát và báo cáo xưởng',
    items: [
      {
        key: 'dashboard.finance.view',
        label: 'Xem chỉ số tài chính & dòng tiền',
        description:
          'Hiển thị doanh thu, lợi nhuận, chi phí và công nợ trên Trang chủ, Báo cáo và Hồ sơ đối tác',
      },
      {
        key: 'reconciliation.view',
        label: 'Truy cập Đối soát dữ liệu',
        description: 'Xem và kiểm tra tính toàn vẹn dữ liệu xuất-nhập-tồn, lô xay và tạm ứng tại /doi-soat',
      },
      {
        key: 'reports.view',
        label: 'Truy cập Báo cáo tổng hợp',
        description: 'Xem báo cáo sản lượng nhập-xuất, hiệu suất xay phế tại /bao-cao',
      },
    ],
  },
  {
    id: 'scrap_operations',
    title: '2. Quản lý Phế & Cân điện tử',
    subtitle: 'Quyền vận hành nghiệp vụ Nhập phế, Xay phế, Xuất bán và Cân hàng ngày',
    items: [
      {
        key: 'scrap.view',
        label: 'Truy cập phân hệ Quản lý Phế',
        description: 'Mở trang Quản lý Phế (/phe) gồm các tab Nhập phế, Xay phế, Xuất phế và Cân phế',
      },
      {
        key: 'scrap.create',
        label: 'Tạo phiếu Nhập, Xuất, Lô xay & Phiên cân mới',
        description: 'Cho phép ghi nhận các giao dịch cân và nhập/xay/xuất phế liệu mới hàng ngày',
      },
      {
        key: 'scrap.edit_delete',
        label: 'Sửa / Xóa phiếu & Quản lý phiên cân',
        description: 'Cho phép chỉnh sửa hoặc xóa phiếu Nhập, Xuất, Lô xay đã lưu và sửa thông số cân',
      },
    ],
  },
  {
    id: 'inventory_contacts',
    title: '3. Tồn kho & Danh bạ đối tác',
    subtitle: 'Quyền theo dõi tồn kho, kiểm kê thực tế và quản lý nhà cung cấp / khách mua',
    items: [
      {
        key: 'inventory.view',
        label: 'Xem Tồn kho & biến động kho',
        description: 'Truy cập trang Tồn kho (/ton-kho) để theo dõi lượng phế nguyên liệu và hạt xay',
      },
      {
        key: 'inventory.count',
        label: 'Thực hiện Kiểm kê kho thực tế',
        description: 'Ghi nhận phiếu kiểm kê kho định kỳ và đối chiếu chênh lệch tồn kho',
      },
      {
        key: 'inventory.opening_stock',
        label: 'Chỉnh sửa Tồn kho đầu kỳ',
        description: 'Thay đổi số liệu tồn kho đầu kỳ làm mốc tính toán toàn hệ thống',
      },
      {
        key: 'contacts.view',
        label: 'Xem Danh bạ đối tác',
        description: 'Truy cập danh sách nhà cung cấp, khách mua và lịch sử giao dịch tại /danh-ba',
      },
      {
        key: 'contacts.manage',
        label: 'Thêm / Sửa / Xóa đối tác',
        description: 'Tạo mới hoặc cập nhật thông tin liên hệ, bảng giá riêng của đối tác',
      },
    ],
  },
  {
    id: 'finance_debt',
    title: '4. Tài chính & Công nợ',
    subtitle: 'Quyền quản lý chi phí vận hành, tạm ứng, thu/chi công nợ và hóa đơn',
    items: [
      {
        key: 'finance.view',
        label: 'Truy cập phân hệ Tài chính',
        description: 'Mở trang Tài chính (/tai-chinh) gồm Chi phí vận hành, Tạm ứng và Công nợ',
      },
      {
        key: 'finance.manage_expenses',
        label: 'Tạo / Sửa / Xóa Chi phí & Tạm ứng',
        description: 'Ghi nhận và điều chỉnh các khoản chi phí điện, nước, vận chuyển và tạm ứng xưởng',
      },
      {
        key: 'finance.record_payment',
        label: 'Ghi nhận thanh toán Công nợ',
        description: 'Thực hiện thu tiền khách mua hoặc thanh toán tiền hàng cho nhà cung cấp',
      },
      {
        key: 'attachments.delete',
        label: 'Xóa ảnh hóa đơn / chứng từ đính kèm',
        description: 'Cho phép xóa ảnh chụp hóa đơn, phiếu cân hoặc ủy nhiệm chi đã tải lên',
      },
    ],
  },
  {
    id: 'hr_payroll',
    title: '5. Nhân sự & Tiền lương',
    subtitle: 'Quyền theo dõi danh sách công nhân, chấm công hàng ngày và quyết toán lương',
    items: [
      {
        key: 'hr.view',
        label: 'Truy cập phân hệ Quản lý Nhân sự',
        description: 'Xem danh sách nhân viên, bảng chấm công và lịch sử lương tại /nhan-vien',
      },
      {
        key: 'hr.manage',
        label: 'Chấm công, Quản lý hồ sơ & Chốt kỳ lương',
        description: 'Thêm/sửa nhân sự, ghi nhận công & tăng ca hàng ngày, quyết toán chốt lương tháng',
      },
    ],
  },
  {
    id: 'system_admin',
    title: '6. Quản trị Hệ thống',
    subtitle: 'Quyền cấu hình tham số xưởng, sao lưu dữ liệu, quản lý tài khoản và phân quyền',
    items: [
      {
        key: 'settings.manage',
        label: 'Quản trị Cài đặt, Tài khoản & Phân quyền',
        description: 'Truy cập trang Cài đặt (/cai-dat), quản lý tài khoản và thay đổi ma trận phân quyền',
        adminLocked: true,
      },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key),
);

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionMap> = {
  admin: {
    'dashboard.finance.view': true,
    'reconciliation.view': true,
    'reports.view': true,
    'scrap.view': true,
    'scrap.create': true,
    'scrap.edit_delete': true,
    'inventory.view': true,
    'inventory.count': true,
    'inventory.opening_stock': true,
    'contacts.view': true,
    'contacts.manage': true,
    'finance.view': true,
    'finance.manage_expenses': true,
    'finance.record_payment': true,
    'attachments.delete': true,
    'hr.view': true,
    'hr.manage': true,
    'settings.manage': true,
  },
  manager: {
    'dashboard.finance.view': true,
    'reconciliation.view': true,
    'reports.view': true,
    'scrap.view': true,
    'scrap.create': true,
    'scrap.edit_delete': true,
    'inventory.view': true,
    'inventory.count': true,
    'inventory.opening_stock': false,
    'contacts.view': true,
    'contacts.manage': true,
    'finance.view': true,
    'finance.manage_expenses': true,
    'finance.record_payment': true,
    'attachments.delete': true,
    'hr.view': true,
    'hr.manage': true,
    'settings.manage': false,
  },
  accountant: {
    'dashboard.finance.view': true,
    'reconciliation.view': true,
    'reports.view': true,
    'scrap.view': false,
    'scrap.create': false,
    'scrap.edit_delete': false,
    'inventory.view': true,
    'inventory.count': false,
    'inventory.opening_stock': false,
    'contacts.view': true,
    'contacts.manage': false,
    'finance.view': true,
    'finance.manage_expenses': true,
    'finance.record_payment': true,
    'attachments.delete': true,
    'hr.view': true,
    'hr.manage': true,
    'settings.manage': false,
  },
  warehouse_manager: {
    'dashboard.finance.view': false,
    'reconciliation.view': true,
    'reports.view': true,
    'scrap.view': true,
    'scrap.create': true,
    'scrap.edit_delete': true,
    'inventory.view': true,
    'inventory.count': true,
    'inventory.opening_stock': false,
    'contacts.view': true,
    'contacts.manage': true,
    'finance.view': false,
    'finance.manage_expenses': false,
    'finance.record_payment': false,
    'attachments.delete': false,
    'hr.view': false,
    'hr.manage': false,
    'settings.manage': false,
  },
  staff: {
    'dashboard.finance.view': false,
    'reconciliation.view': true,
    'reports.view': true,
    'scrap.view': true,
    'scrap.create': true,
    'scrap.edit_delete': false,
    'inventory.view': true,
    'inventory.count': false,
    'inventory.opening_stock': false,
    'contacts.view': true,
    'contacts.manage': false,
    'finance.view': false,
    'finance.manage_expenses': false,
    'finance.record_payment': false,
    'attachments.delete': false,
    'hr.view': false,
    'hr.manage': false,
    'settings.manage': false,
  },
};

export function resolveEffectivePermissions(
  role: UserRole,
  rolePermissions?: Partial<Record<PermissionKey, boolean>> | null,
  customPermissions?: Partial<Record<PermissionKey, boolean>> | null,
): PermissionMap {
  if (role === 'admin') {
    return { ...DEFAULT_ROLE_PERMISSIONS.admin };
  }

  const base = DEFAULT_ROLE_PERMISSIONS[role] ?? DEFAULT_ROLE_PERMISSIONS.staff;
  const merged: PermissionMap = { ...base };

  if (rolePermissions && typeof rolePermissions === 'object') {
    for (const key of ALL_PERMISSION_KEYS) {
      if (key !== 'settings.manage' && typeof rolePermissions[key] === 'boolean') {
        merged[key] = rolePermissions[key]!;
      }
    }
  }

  if (customPermissions && typeof customPermissions === 'object') {
    for (const key of ALL_PERMISSION_KEYS) {
      if (key !== 'settings.manage' && typeof customPermissions[key] === 'boolean') {
        merged[key] = customPermissions[key]!;
      }
    }
  }

  merged['settings.manage'] = false;
  return merged;
}

export function checkUserPermission(
  user: { role: UserRole; permissions?: Partial<PermissionMap> } | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.permissions && typeof user.permissions[permission] === 'boolean') {
    return user.permissions[permission]!;
  }
  return DEFAULT_ROLE_PERMISSIONS[user.role]?.[permission] ?? false;
}
