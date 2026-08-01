import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Tìm hồ sơ trong bảng `users` khớp với phiên đăng nhập Supabase Auth hiện tại.
 * Nếu chưa có auth_id (tài khoản được admin cấp trước qua email), tự "nhận"
 * hồ sơ theo email khớp với JWT — RLS chỉ cho phép làm việc này đúng 1 lần
 * (xem policy `users_claim_own_profile_by_email` trong migration 003).
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncSession = async (session: Session | null) => {
      if (!session?.user) {
        if (active) setUser(null);
        return;
      }
      const profile = await resolveProfile(session);
      if (!active) return;
      if (profile) {
        setUser(profile);
      } else {
        // Đăng nhập Supabase thành công nhưng chưa được admin cấp hồ sơ trong bảng `users`.
        // Không suy đoán quyền — coi như chưa có quyền thao tác nghiệp vụ (RLS sẽ tự chặn ghi).
        setUser({ email: session.user.email || '', name: session.user.email || 'Người dùng mới', role: 'staff' });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session).finally(() => {
        if (active) setLoading(false);
      });
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

      if (error || !data.session) {
        return { error: error?.message || 'Sai email hoặc mật khẩu' };
      }

      const profile = await resolveProfile(data.session);
      if (profile) {
        setUser(profile);
      } else {
        setUser({ email, name: email, role: 'staff' });
      }
      return {};
    } catch (e: any) {
      return { error: e.message || 'Lỗi đăng nhập' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
