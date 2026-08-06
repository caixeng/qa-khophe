import * as React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/auth';
import type { UserRole } from '../types';

/**
 * Chặn route theo vai trò.
 *
 * Đây là lớp bảo vệ về trải nghiệm, KHÔNG phải lớp bảo mật: RLS trên Supabase
 * mới là thứ thực sự chặn dữ liệu. Mục đích ở đây là để người không có quyền
 * nhận được câu giải thích rõ ràng, thay vì vào trang rồi thấy lỗi đỏ khắp nơi
 * vì mọi truy vấn đều bị từ chối.
 */
export const RequireRole: React.FC<{ allow: UserRole[]; children: React.ReactElement }> = ({
  allow,
  children,
}) => {
  const { user } = useAuth();

  if (user && allow.includes(user.role)) {
    return children;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Bạn không có quyền xem mục này</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-md">
        Mục này chỉ dành cho {allow.includes('manager') ? 'quản lý và quản trị viên' : 'quản trị viên'}. Nếu
        bạn cần truy cập, hãy liên hệ quản trị viên để được cấp quyền.
      </p>
    </div>
  );
};
