import { createContext, useContext } from 'react';
import type { UserRole } from '../types';
import { checkUserPermission, type PermissionKey, type PermissionMap } from '../lib/permissions';

/**
 * Context và hook của Auth tách khỏi file chứa `AuthProvider` để React Fast
 * Refresh làm mới được provider mà không remount toàn bộ cây component.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  permissions?: Partial<PermissionMap>;
}

export interface UpdateOwnProfileInput {
  name: string;
  phone?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  /** true trong lúc kiểm tra phiên đăng nhập lúc khởi động — dùng để chặn render sớm */
  loading: boolean;
  /** true trong lúc đang gửi form đăng nhập */
  signingIn: boolean;
  /** Kiểm tra quyền chi tiết theo cấu hình phân quyền động */
  can?: (permission: PermissionKey) => boolean;
  /** Làm mới lại bộ quyền hiệu lực của phiên hiện tại sau khi Admin lưu cấu hình */
  refreshPermissions?: () => Promise<void>;
  /** Cập nhật thông tin cá nhân (họ tên, số điện thoại) của tài khoản đang đăng nhập */
  updateProfile?: (input: UpdateOwnProfileInput) => Promise<{ error?: string }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  const can = ctx.can ?? ((permission: PermissionKey) => checkUserPermission(ctx.user, permission));
  const refreshPermissions = ctx.refreshPermissions ?? (async () => {});
  const updateProfile =
    ctx.updateProfile ?? (async () => ({ error: 'Chức năng cập nhật hồ sơ chưa sẵn sàng.' }));
  return {
    ...ctx,
    can,
    refreshPermissions,
    updateProfile,
  };
};
