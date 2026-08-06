import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, type UserProfile } from './auth';

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

  const { data: byAuthId } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('auth_id', authId)
    .maybeSingle();

  if (byAuthId) {
    return { id: byAuthId.id, name: byAuthId.full_name, email: byAuthId.email, role: byAuthId.role };
  }

  if (!email) return null;

  // Admin có thể tạo sẵn dòng users theo email trước khi người đó đăng nhập lần
  // đầu; lần đăng nhập đầu tiên sẽ tự gắn auth_id vào đúng dòng đó.
  const { data: byEmail } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('email', email)
    .is('auth_id', null)
    .maybeSingle();

  if (!byEmail) return null;

  const { data: linked } = await supabase
    .from('users')
    .update({ auth_id: authId })
    .eq('id', byEmail.id)
    .select('id, full_name, email, role')
    .single();

  const profile = linked || byEmail;
  return { id: profile.id, name: profile.full_name, email: profile.email, role: profile.role };
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
        void applySession(session);
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
      const trimmed = email.trim();

      if (!trimmed.includes('@')) {
        return { error: 'Vui lòng đăng nhập bằng địa chỉ email đã được cấp.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: pass,
      });

      if (error || !data.session) {
        return { error: 'Email hoặc mật khẩu không đúng.' };
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
    <AuthContext.Provider value={{ user, login, logout, loading, signingIn }}>
      {children}
    </AuthContext.Provider>
  );
};
