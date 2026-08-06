import { createContext, useContext } from 'react';
import type { UserRole } from '../types';

/**
 * Context và hook của Auth tách khỏi file chứa `AuthProvider` để React Fast
 * Refresh làm mới được provider mà không remount toàn bộ cây component.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  /** true trong lúc kiểm tra phiên đăng nhập lúc khởi động — dùng để chặn render sớm */
  loading: boolean;
  /** true trong lúc đang gửi form đăng nhập */
  signingIn: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
