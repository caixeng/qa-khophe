import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, loading, signingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Đã có phiên hợp lệ (vd: mở lại tab) → về thẳng trang trước đó thay vì bắt đăng nhập lại
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from || '/', { replace: true });
    }
  }, [loading, user, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from || '/', { replace: true });
    }
  };

  return (
    <div className="screen-min-height safe-screen-padding flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="card w-full max-w-md p-8 bg-[var(--bg-surface)] rounded-2xl shadow-[var(--shadow-card)] animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-[var(--primary-600)] to-[var(--primary-400)] text-white shadow-lg mb-4 overflow-hidden p-0.5 ring-2 ring-[var(--primary-400)]/30">
            <img
              src="/vua_phe_logo2.jpg"
              alt="VUA PHẾ Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--primary-500)]">VUA PHẾ</h1>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] mt-1">
            Quản lý & Tái chế Phế liệu Nhựa
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="label-field">EMAIL</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10 font-semibold"
                placeholder="ten@congty.vn"
              />
            </div>
          </div>

          <div>
            <label className="label-field">MẬT KHẨU</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-10 font-mono"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={signingIn}
            className="w-full btn-primary py-3 text-sm font-bold shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
