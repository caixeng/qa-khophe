import { describe, it, expect, vi, afterEach } from 'vitest';
import { today, daysAgo } from './useDateRange';

afterEach(() => {
  vi.useRealTimers();
});

describe('today', () => {
  it('dùng ngày theo giờ địa phương, không phải UTC', () => {
    // Đây là lỗi rất dễ mắc: toISOString() quy về UTC, nên ở múi giờ +07 mọi
    // thao tác trước 7h sáng sẽ bị ghi lùi mất một ngày — phiếu nhập lúc 6h
    // sáng ngày 6/8 sẽ rơi vào ngày 5/8 và lệch cả báo cáo kỳ.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 6, 6, 0, 0)); // 06:00 sáng 06/08/2026 giờ địa phương

    expect(today()).toBe('2026-08-06');
    expect(new Date(2026, 7, 6, 6, 0, 0).toISOString().split('T')[0]).not.toBe('2026-08-06');
  });

  it('đệm số 0 cho tháng và ngày một chữ số', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0)); // 05/01/2026
    expect(today()).toBe('2026-01-05');
  });
});

describe('daysAgo', () => {
  it('lùi đúng số ngày', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 6, 12, 0, 0));
    expect(daysAgo(6)).toBe('2026-07-31');
  });

  it('lùi qua ranh giới tháng', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 2, 12, 0, 0)); // 02/08/2026
    expect(daysAgo(5)).toBe('2026-07-28');
  });

  it('lùi qua ranh giới năm', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0, 0)); // 02/01/2026
    expect(daysAgo(3)).toBe('2025-12-30');
  });

  it('daysAgo(0) chính là hôm nay', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 6, 12, 0, 0));
    expect(daysAgo(0)).toBe(today());
  });
});
