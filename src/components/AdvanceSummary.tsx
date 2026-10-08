import type { Advance } from '../types';
import { summarizeAdvances, advancePurposeLabels } from '../lib/advances';
import { formatTien } from '../lib/utils';

export function AdvanceSummary({ advances }: { advances: readonly Advance[] }) {
  const totals = summarizeAdvances(advances);
  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-bold">Tiền ứng theo mục đích</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {totals.byPurpose.map((row) => (
          <div key={row.purpose} className="rounded-xl border border-[var(--border-color)] p-3 min-w-0">
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {advancePurposeLabels[row.purpose]}
            </p>
            <p className="mt-1 font-bold tabular-nums">{formatTien(row.issued)}đ</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Hoàn trong kỳ: {formatTien(row.returned)}đ
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Đã đối soát: {formatTien(row.accounted)}đ · Còn: {formatTien(row.outstanding)}đ
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        Tiền ứng được theo dõi riêng, không cộng thêm vào chi phí. Đối soát liên kết với phiếu chi, thanh toán
        nhập hoặc lượt ứng lương đã ghi nhận; mỗi chứng từ dùng một nguồn ứng. Số đã đối soát và số còn lại
        tính đến hiện tại cho các phiếu ứng đang hiển thị.
      </p>
      {totals.unclassified > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Có {formatTien(totals.unclassified)}đ chưa phân loại. Cần sửa mục đích trước khi đối soát.
        </p>
      )}
    </div>
  );
}
