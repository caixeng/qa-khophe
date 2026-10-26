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
  role: UserRole;
  permissions?: Partial<PermissionMap>;
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
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  const can = ctx.can ?? ((permission: PermissionKey) => checkUserPermission(ctx.user, permission));
  const refreshPermissions = ctx.refreshPermissions ?? (async () => {});
  return {
    ...ctx,
    can,
    refreshPermissions,
  };
};
