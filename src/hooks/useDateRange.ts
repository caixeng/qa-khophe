import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DateRange {
  /** yyyy-mm-dd, đã bao gồm ngày này */
  from: string;
  /** yyyy-mm-dd, đã bao gồm ngày này */
  to: string;
}

function toISODate(d: Date): string {
  // Dùng giờ địa phương, KHÔNG dùng toISOString() — toISOString() quy về UTC,
  // nên ở múi giờ +07 mọi thao tác trước 7h sáng sẽ bị lùi mất một ngày.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toISODate(new Date());
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** Mặc định: 90 ngày gần nhất — đủ rộng cho công việc hằng ngày, đủ hẹp để truy vấn nhanh. */
export const DEFAULT_RANGE_DAYS = 90;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Khoảng ngày dùng chung, lưu trong URL query (`?from=…&to=…`).
 *
 * Để trong URL chứ không phải state cục bộ vì ba lý do: chuyển tab không mất
 * kỳ đang xem, người dùng gửi link cho nhau là thấy đúng cùng một kỳ, và bấm
 * nút Back của trình duyệt quay lại kỳ trước đó như mong đợi.
 */
export function useDateRange() {
  const [searchParams, setSearchParams] = useSearchParams();

  const range = useMemo<DateRange>(() => {
    const rawFrom = searchParams.get('from');
    const rawTo = searchParams.get('to');

    const from = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : daysAgo(DEFAULT_RANGE_DAYS);
    const to = rawTo && ISO_DATE.test(rawTo) ? rawTo : today();

    // Người dùng có thể sửa URL hoặc chọn ngược ngày — đảo lại cho hợp lý thay
    // vì trả về một khoảng rỗng và hiện "không có dữ liệu" một cách khó hiểu.
    return from > to ? { from: to, to: from } : { from, to };
  }, [searchParams]);

  const setRange = useCallback(
    (from: string, to: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('from', from);
          next.set('to', to);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { range, setRange };
}
