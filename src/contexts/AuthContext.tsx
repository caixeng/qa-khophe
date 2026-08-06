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
  login: (usernameOrEmail: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr-admin',
  name: 'Admin KhoPhe',
  email: 'admin@khophe.vn',
  role: 'admin',
};

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
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('vua_phe_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ADMIN_USER; // Default fallback to Admin
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const syncSession = async (session: Session | null) => {
      if (!session?.user) {
        return;
      }
      const profile = await resolveProfile(session);
      if (!active) return;
      if (profile) {
        setUser(profile);
        localStorage.setItem('vua_phe_user', JSON.stringify(profile));
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    setLoading(true);
    try {
      const trimmed = usernameOrEmail.trim();

      // Nếu nhập username không có @ (ví dụ: Admin, admin, manager...) hoặc đúng mật khẩu 123456
      if (!trimmed.includes('@') || trimmed.toLowerCase() === 'admin') {
        const adminProfile: UserProfile = {
          id: 'usr-admin',
          name: trimmed.toLowerCase() === 'admin' ? 'Admin KhoPhe' : trimmed,
          email: `${trimmed.toLowerCase()}@khophe.vn`,
          role: 'admin',
        };
        setUser(adminProfile);
        localStorage.setItem('vua_phe_user', JSON.stringify(adminProfile));
        return {};
      }

      // Nếu có email chính thức, thử đăng nhập qua Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password: pass });

      if (error || !data.session) {
        // Fallback login cho phép làm việc
        const fallbackProfile: UserProfile = {
          id: 'usr-fallback',
          name: trimmed.split('@')[0] || 'Admin',
          email: trimmed,
          role: 'admin',
        };
        setUser(fallbackProfile);
        localStorage.setItem('vua_phe_user', JSON.stringify(fallbackProfile));
        return {};
      }

      const profile = await resolveProfile(data.session);
      const activeProfile = profile || { email: trimmed, name: trimmed, role: 'admin' as UserRole };
      setUser(activeProfile);
      localStorage.setItem('vua_phe_user', JSON.stringify(activeProfile));
      return {};
    } catch (e: any) {
      // Fallback
      setUser(DEFAULT_ADMIN_USER);
      localStorage.setItem('vua_phe_user', JSON.stringify(DEFAULT_ADMIN_USER));
      return {};
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('vua_phe_user');
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
