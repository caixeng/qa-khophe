import { useAsyncData } from '../hooks/useAsyncData';
import { reviewService } from '../services/reviewService';
import { DataState } from './DataState';
import { formatTien } from '../lib/utils';

const labels: Record<string, string> = {
  receipts: 'Thu bán hàng',
  materials: 'Trả tiền nguyên liệu trực tiếp',
  expenses: 'Chi xưởng trực tiếp',
  advances: 'Tiền ứng đã giao',
  returns: 'Tiền ứng hoàn lại',
  payroll_advances: 'Ứng lương trực tiếp',
  payroll: 'Lương đã chốt trả',
  manual_payroll: 'Lương đánh dấu đã trả trực tiếp',
};
export function CashFlowPanel({ from, to }: { from: string; to: string }) {
  const { data, loading, error, refetch } = useAsyncData(
    () => reviewService.getCashFlow(from, to),
    [from, to],
  );
  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-bold text-sm">Dòng tiền đã ghi nhận trong kỳ</h3>
      <DataState loading={loading} error={error} onRetry={refetch}>
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                ['Tổng thu', data.inflow],
                ['Tổng chi', data.outflow],
                ['Thu − chi', data.net],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-[var(--bg-subtle)] p-3 min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">{label}</p>
                  <p className="font-bold tabular-nums break-words">{formatTien(Number(value))}đ</p>
                </div>
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-bold py-2">Chi tiết thu / chi</summary>
              <dl className="divide-y divide-[var(--border-color)]">
                {Object.entries(data.categories).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 py-2 text-xs">
                    <dt>{labels[key] || key}</dt>
                    <dd className="font-mono shrink-0">{formatTien(value)}đ</dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}
      </DataState>
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        Tính theo ngày thanh toán/ứng/hoàn và ngày trả lương. Chứng từ dùng tiền ứng không tính chi lần hai.
        Số thu/chi chỉ gồm giao dịch đã ghi nhận; trạng thái “đã trả” của phiếu nhập/xuất cũ không thay thế
        chứng từ tiền. Đây là dòng tiền trong kỳ, chưa phải số dư quỹ hay lợi nhuận.
      </p>
    </section>
  );
}
