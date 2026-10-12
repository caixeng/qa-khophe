import { supabase } from '../lib/supabase';
import { runQuery } from '../lib/serviceError';
import { useAsyncList } from '../hooks/useAsyncData';
import { DataState } from './DataState';
import { formatNgay } from '../lib/utils';

interface AppError {
  id: string;
  message: string;
  context: string | null;
  path: string | null;
  created_at: string;
}
const getErrors = () =>
  runQuery<AppError[]>('tải nhật ký lỗi', () =>
    supabase
      .from('app_error_logs')
      .select('id,message,context,path,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  );
export function AppErrorPanel() {
  const { data, loading, error, refetch } = useAsyncList(getErrors, []);
  return (
    <section className="card p-4 space-y-3">
      <div className="flex justify-between gap-3">
        <h2 className="text-sm font-bold">Nhật ký lỗi tập trung</h2>
        <button className="btn-secondary text-xs" onClick={() => void refetch()}>
          Làm mới
        </button>
      </div>
      <DataState
        loading={loading}
        error={error}
        isEmpty={data.length === 0}
        emptyTitle="Chưa ghi nhận lỗi"
        onRetry={refetch}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.map((row) => (
            <div key={row.id} className="rounded-lg bg-[var(--bg-subtle)] p-3 text-xs break-words">
              <p className="font-semibold">{row.message}</p>
              <p className="mt-1 text-[var(--text-muted)]">
                {formatNgay(row.created_at)} · {row.context || 'Ứng dụng'} · {row.path}
              </p>
            </div>
          ))}
        </div>
      </DataState>
      <p className="text-xs text-[var(--text-muted)]">
        30 lỗi gần nhất của người dùng đã đăng nhập. Chỉ gửi thông báo đã che thông tin nhạy cảm và đường dẫn
        trang; không gửi mật khẩu, token hay nội dung biểu mẫu.
      </p>
    </section>
  );
}
