import { Link } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData';
import { reviewService } from '../services/reviewService';
import { DataState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { formatKg, formatTien } from '../lib/utils';

export function DoiSoatPage() {
  const { data, loading, error, refetch } = useAsyncData(reviewService.getStatus, []);
  if (loading || error || !data) return <DataState loading={loading} error={error} onRetry={refetch} />;
  const stock = data.inventory;
  const items = [
    {
      title: 'Tồn thành phẩm',
      value: formatKg(stock.currentStockKg),
      issue: stock.currentStockKg < 0,
      detail: `Đầu kỳ ${formatKg(stock.openingStock)} + nhập thành phẩm ${formatKg(stock.totalImported)} + xay ra ${formatKg(stock.totalGround)} − xuất thành phẩm ${formatKg(stock.totalExported)}`,
      to: '/ton-kho',
    },
    {
      title: 'Tồn nguyên liệu',
      value: formatKg(stock.rawStockKg),
      issue: stock.rawStockKg < 0,
      detail: `Nhập nguyên liệu ${formatKg(data.rawImported)} − đưa vào xay ${formatKg(data.grindingInput)} − xuất nguyên liệu ${formatKg(data.rawExported)}; có cộng tồn nguyên liệu đầu kỳ đã cấu hình.`,
      to: '/ton-kho',
    },
    {
      title: 'Phiếu xay chưa gắn lô nhập',
      value: `${data.unlinkedLots} phiếu`,
      issue: data.unlinkedLots > 0,
      detail: 'Đối chiếu lô nguyên liệu để truy xuất hao hụt; không tự gán lô cho dữ liệu cũ.',
      to: '/phe?tab=xay',
    },
    {
      title: 'Phiếu xay ghi hao hụt 0%',
      value: `${data.zeroLossLots} phiếu`,
      issue: data.zeroLossLots > 0,
      detail: 'Có thể hợp lệ. Kiểm tra lại cân đầu vào và đầu ra trước khi kết luận không có hao hụt.',
      to: '/phe?tab=xay',
    },
    {
      title: 'Hao hụt chưa rõ nguyên nhân',
      value: `${data.lossUnclassified} phiếu`,
      issue: data.lossUnclassified > 0,
      detail: 'Bổ sung danh mục và diễn giải nguyên nhân cho các phiếu có hao hụt.',
      to: '/phe?tab=xay',
    },
    ...(data.unclassifiedAdvances === undefined
      ? []
      : [
          {
            title: 'Tiền ứng chưa phân loại',
            value: `${formatTien(data.unclassifiedAdvances)}đ`,
            issue: data.unclassifiedAdvances > 0,
            detail: `Tổng tiền ứng còn phải đối soát: ${formatTien(data.advanceOutstanding || 0)}đ. Chọn đúng mục đích và liên kết chứng từ.`,
            to: '/tai-chinh?tab=chiphi&view=ungtien',
          },
          {
            title: 'Nhân sự chưa có đơn giá lương',
            value: `${data.employeesWithoutSalary} người`,
            issue: (data.employeesWithoutSalary || 0) > 0,
            detail:
              'Cần cấu hình trước khi chấm công có lương; giữ nguyên các hồ sơ chưa xác định mức lương.',
            to: '/nhan-vien',
          },
        ]),
  ];
  return (
    <div className="page-shell space-y-4">
      <PageHeader title="Đối soát dữ liệu" subtitle="Số liệu hiện tại và các nghiệp vụ cần kiểm tra" />
      <p className="card p-4 text-sm text-[var(--text-secondary)]">
        Đối soát theo chứng từ và kiểm kê thực tế. Phiếu kiểm kê ghi nhận chênh lệch; không tự điều chỉnh tồn
        kho. Chỉ cập nhật tồn đầu kỳ sau khi xác định đúng số dư và thời điểm bắt đầu ghi sổ.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className={`card p-4 min-w-0 space-y-2 border ${item.issue ? 'border-amber-400' : 'border-[var(--border-color)]'}`}
          >
            <p className="text-xs font-bold text-[var(--text-muted)]">{item.title}</p>
            <p className="text-xl font-bold tabular-nums break-words">{item.value}</p>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{item.detail}</p>
            <p className="text-xs font-bold text-[var(--primary-500)]">
              {item.issue ? 'Kiểm tra chứng từ →' : 'Xem chi tiết →'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
