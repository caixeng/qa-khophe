import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('khophe_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { name: 'Admin KhoPhe', email: 'admin@khophe.vn', role: 'Admin' };
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check active Supabase session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const uProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Admin KhoPhe',
          email: session.user.email || 'admin@khophe.vn',
          role: 'Admin',
        };
        setUser(uProfile);
        localStorage.setItem('khophe_user', JSON.stringify(uProfile));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const uProfile = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Admin KhoPhe',
          email: session.user.email || 'admin@khophe.vn',
          role: 'Admin',
        };
        setUser(uProfile);
        localStorage.setItem('khophe_user', JSON.stringify(uProfile));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        // Fallback for dev mode if offline/credentials mismatch
        if (email === 'admin@khophe.vn' && pass === '123456') {
          const uProfile = { name: 'Admin KhoPhe', email, role: 'Admin' };
          setUser(uProfile);
          localStorage.setItem('khophe_user', JSON.stringify(uProfile));
          return {};
        }
        return { error: error.message };
      }

      if (data.user) {
        const uProfile = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Admin KhoPhe',
          email: data.user.email || email,
          role: 'Admin',
        };
        setUser(uProfile);
        localStorage.setItem('khophe_user', JSON.stringify(uProfile));
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
    localStorage.removeItem('khophe_user');
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
