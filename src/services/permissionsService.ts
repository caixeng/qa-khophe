import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';
import type { UserRole } from '../types';
import type { PermissionMap } from '../lib/permissions';

export interface RolePermissionMatrixRow {
  role: UserRole;
  permissions: PermissionMap;
  updated_at: string;
}

export const permissionsService = {
  getMyPermissions: () =>
    runQuery<Partial<PermissionMap>>('tải phân quyền cá nhân', () => supabase.rpc('get_my_permissions')),

  getMatrix: () =>
    runQuery<RolePermissionMatrixRow[]>('tải ma trận phân quyền', () =>
      supabase.rpc('get_role_permissions_matrix'),
    ),

  updateRolePermissions: (role: UserRole, permissions: Partial<PermissionMap>) =>
    runQuery<boolean>('lưu cấu hình phân quyền', () =>
      supabase.rpc('admin_update_role_permissions', {
        p_role: role,
        p_permissions: permissions,
      }),
    ),

  resetRolePermissions: (role?: UserRole) =>
    runQuery<boolean>('khôi phục phân quyền mặc định', () =>
      supabase.rpc('admin_reset_role_permissions', {
        p_role: role ?? null,
      }),
    ),
};
