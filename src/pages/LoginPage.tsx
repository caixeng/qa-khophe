import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth';
import { Lock, User, Eye, EyeOff, Loader2, Recycle, Package, Scale, BarChart3 } from 'lucide-react';

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
    <div className="login-screen screen-min-height safe-screen-padding flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="login-shell card w-full max-w-5xl overflow-hidden grid lg:grid-cols-2 rounded-3xl">
        <aside className="login-story hidden lg:flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Recycle size={27} />
            <div>
              <p className="font-bold text-lg text-white">VUA PHẾ</p>
              <p className="text-xs tracking-wider mt-1 text-slate-300">QUẢN LÝ XƯỞNG TÁI CHẾ</p>
            </div>
          </div>
          <div className="my-16">
            <div className="eyebrow">Từ phế liệu đến giá trị</div>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white mt-4">
              Vận hành rõ ràng.
              <br />
              Kiểm soát mỗi ngày.
            </h2>
            <p className="text-sm leading-relaxed mt-5 text-slate-300 max-w-sm">
              Một nơi để theo dõi hàng nhập, sản lượng xay, cân xuất và đối soát công nợ của xưởng.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              { icon: Package, label: 'Kho & sản lượng' },
              { icon: Scale, label: 'Cân & chứng từ' },
              { icon: BarChart3, label: 'Báo cáo xưởng' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="space-y-3">
                <Icon size={19} />
                <p className="text-[11px] text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </aside>
        <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 overflow-hidden border border-[var(--border-color)]">
              <img
                src="/vua_phe_logo2.jpg"
                alt="VUA PHẾ Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Chào mừng trở lại
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-2">Đăng nhập để tiếp tục quản lý xưởng.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="label-field">
                Tên đăng nhập hoặc email
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="login-email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 font-semibold"
                  placeholder="thanhnam / xuantu / mimi"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="label-field">
                Mật khẩu
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
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
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
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
          <p className="text-xs text-[var(--text-muted)] mt-8">
            Dùng tài khoản đã được quản trị viên cấp quyền.
          </p>
        </div>
      </div>
    </div>
  );
};
