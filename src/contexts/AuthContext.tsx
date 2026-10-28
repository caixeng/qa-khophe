import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, type UpdateOwnProfileInput, type UserProfile } from './auth';
import {
  checkUserPermission,
  resolveEffectivePermissions,
  type PermissionKey,
  type PermissionMap,
} from '../lib/permissions';
import type { UserRole } from '../types';

async function fetchEffectivePermissions(role: UserRole): Promise<PermissionMap> {
  if (role === 'admin') {
    return resolveEffectivePermissions('admin');
  }
  try {
    const { data, error } = await supabase.rpc('get_my_permissions');
    if (!error && data && typeof data === 'object') {
      return resolveEffectivePermissions(role, data as Partial<PermissionMap>);
    }
  } catch {
    // Fallback xuống bộ quyền mặc định nếu RPC chưa sẵn sàng
  }
  return resolveEffectivePermissions(role);
}

/**
 * Lấy hồ sơ người dùng trong bảng `users` tương ứng với phiên Supabase Auth.
 *
 * Hồ sơ này quyết định `role`, và `role` là thứ mọi policy RLS dựa vào. Không có
 * hồ sơ = không có quyền gì trong DB, nên trường hợp đó phải báo lỗi rõ ràng chứ
 * không được tự gán một vai trò mặc định ở phía client.
 */
async function resolveProfile(session: Session): Promise<UserProfile | null> {
  const authId = session.user.id;
  const email = session.user.email;

  const { data: byAuthId, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role')
    .eq('auth_id', authId)
    .eq('is_active', true)
    .maybeSingle();
  if (profileError) throw profileError;

  if (byAuthId) {
    const permissions = await fetchEffectivePermissions(byAuthId.role);
    return {
      id: byAuthId.id,
      name: byAuthId.full_name,
      email: byAuthId.email,
      phone: byAuthId.phone,
      role: byAuthId.role,
      permissions,
    };
  }

  if (!email) return null;

  // Admin có thể tạo sẵn dòng users theo email trước khi người đó đăng nhập lần
  // đầu; lần đăng nhập đầu tiên sẽ tự gắn auth_id vào đúng dòng đó.
  const { data: byEmail, error: emailError } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role')
    .eq('email', email)
    .is('auth_id', null)
    .eq('is_active', true)
    .maybeSingle();
  if (emailError) throw emailError;

  if (!byEmail) return null;

  const { data: linked, error: linkError } = await supabase
    .from('users')
    .update({ auth_id: authId })
    .eq('id', byEmail.id)
    .select('id, full_name, email, phone, role')
    .single();

  if (linkError || !linked) throw linkError || new Error(NO_PROFILE_MESSAGE);
  const profile = linked;
  const permissions = await fetchEffectivePermissions(profile.role);
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    permissions,
  };
}

const NO_PROFILE_MESSAGE =
  'Tài khoản đăng nhập được nhưng chưa được cấp quyền trong hệ thống. Liên hệ quản trị viên để thêm bạn vào danh sách người dùng.';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const applySession = useCallback(async (session: Session | null): Promise<string | undefined> => {
    if (!session?.user) {
      setUser(null);
      return undefined;
    }

    const profile = await resolveProfile(session);
    if (!profile) {
      // Đăng nhập hợp lệ nhưng không có hồ sơ → mọi truy vấn sẽ bị RLS chặn.
      // Đăng xuất luôn để không rơi vào trạng thái "đã vào app mà không làm được gì".
      await supabase.auth.signOut();
      setUser(null);
      return NO_PROFILE_MESSAGE;
    }

    setUser(profile);
    return undefined;
  }, []);

  const refreshPermissions = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev;
      void fetchEffectivePermissions(prev.role).then((permissions) => {
        setUser((current) => (current ? { ...current, permissions } : null));
      });
      return prev;
    });
  }, []);

  const updateProfile = useCallback(
    async (input: UpdateOwnProfileInput): Promise<{ error?: string }> => {
      if (!user) return { error: 'Phiên đăng nhập không hợp lệ.' };
      const cleanName = input.name.trim();
      const cleanPhone = input.phone?.trim() || null;

      if (!cleanName) {
        return { error: 'Vui lòng nhập họ và tên hiển thị.' };
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .update({
            full_name: cleanName,
            phone: cleanPhone,
          })
          .eq('id', user.id)
          .select('id, full_name, phone')
          .single();

        if (error || !data) {
          return { error: error?.message || 'Không thể cập nhật thông tin cá nhân.' };
        }

        // Đồng bộ tên hiển thị vào metadata của Supabase Auth (không chặn luồng nếu lỗi phụ)
        void supabase.auth.updateUser({
          data: { full_name: cleanName },
        });

        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: data.full_name,
                phone: data.phone,
              }
            : null,
        );

        return {};
      } catch {
        return { error: 'Không kết nối được tới máy chủ. Vui lòng thử lại.' };
      }
    },
    [user],
  );

  const can = useCallback(
    (permission: PermissionKey): boolean => checkUserPermission(user, permission),
    [user],
  );

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!active) return;
        await applySession(session);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // SIGNED_IN được xử lý trong hàm login() để lấy được thông báo lỗi;
      // ở đây chỉ cần phản ứng với việc phiên bị mất hoặc được làm mới.
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Run outside the auth callback to avoid waiting on the auth lock.
        window.setTimeout(() => {
          void applySession(session).catch(() => setUser(null));
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = async (email: string, pass: string): Promise<{ error?: string }> => {
    setSigningIn(true);
    try {
      const entered = email.trim().toLowerCase();
      const trimmed = entered.includes('@') ? entered : `${entered}@accounts.khophe.local`;

      if (!entered.includes('@') && !/^[a-z0-9._-]{3,40}$/.test(entered)) {
        return { error: 'Tên đăng nhập không hợp lệ.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: pass,
      });

      if (error || !data.session) {
        return { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
      }

      const profileError = await applySession(data.session);
      if (profileError) return { error: profileError };

      return {};
    } catch {
      return { error: 'Không kết nối được tới máy chủ. Kiểm tra lại đường truyền rồi thử lại.' };
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Phiên phía máy chủ có thể đã hết hạn — vẫn phải xoá trạng thái phía client.
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, signingIn, can, refreshPermissions, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
