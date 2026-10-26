import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';
import type { UserRole } from '../types';
import type { PermissionKey } from '../lib/permissions';

export interface ManagedUser {
  id: string;
  auth_id: string | null;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  custom_permissions?: Partial<Record<PermissionKey, boolean>> | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CreateUserAccountInput {
  account: string;
  fullName: string;
  role: UserRole;
  password: string;
  phone?: string;
}

export interface UpdateUserAccountInput {
  userId: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  customPermissions?: Partial<Record<PermissionKey, boolean>> | null;
}

export const usersService = {
  getAll: () => runQuery<ManagedUser[]>('tải danh sách tài khoản', () => supabase.rpc('list_managed_users')),

  createAccount: (input: CreateUserAccountInput) =>
    runQuery<string>('tạo tài khoản mới', () =>
      supabase.rpc('admin_create_user_account', {
        p_account: input.account.trim().toLowerCase(),
        p_full_name: input.fullName.trim(),
        p_role: input.role,
        p_password: input.password,
        p_phone: input.phone?.trim() || null,
      }),
    ),

  updateAccount: (input: UpdateUserAccountInput) =>
    runQuery<boolean>('cập nhật tài khoản', () =>
      supabase.rpc('admin_update_user_account', {
        p_user_id: input.userId,
        p_full_name: input.fullName.trim(),
        p_role: input.role,
        p_phone: input.phone?.trim() || null,
        p_is_active: input.isActive,
        p_custom_permissions: input.customPermissions ?? null,
      }),
    ),

  resetPassword: (userId: string, newPassword: string) =>
    runQuery<boolean>('đặt lại mật khẩu tài khoản', () =>
      supabase.rpc('admin_reset_user_password', {
        p_user_id: userId,
        p_new_password: newPassword,
      }),
    ),
};
