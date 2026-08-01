import { describe, it, expect } from 'vitest';
import { computeInventory, computeRemaining, computeRemainingWithLegacyStatus } from './calc';

describe('computeInventory', () => {
  it('tính tồn kho = tổng xay ra - tổng xuất bán', () => {
    const { currentStockKg, currentBags } = computeInventory(10000, 4000, 900);
    expect(currentStockKg).toBe(6000);
    expect(currentBags).toBe(7); // Math.round(6000/900) = 6.67 -> 7
  });

  it('không cho tồn kho âm khi xuất nhiều hơn tồn thực tế', () => {
    const { currentStockKg, currentBags } = computeInventory(1000, 5000, 900);
    expect(currentStockKg).toBe(0);
    expect(currentBags).toBe(0);
  });

  it('trả về 0 bao khi kgPerBag = 0 (tránh chia cho 0)', () => {
    const { currentBags } = computeInventory(5000, 0, 0);
    expect(currentBags).toBe(0);
  });
});

describe('computeRemaining', () => {
  it('tính đúng nợ còn lại sau khi trả một phần', () => {
    expect(computeRemaining(10000000, 4000000)).toBe(6000000);
  });

  it('trả về 0 khi đã trả đủ hoặc trả dư (không cho âm)', () => {
    expect(computeRemaining(10000000, 10000000)).toBe(0);
    expect(computeRemaining(10000000, 12000000)).toBe(0);
  });

  it('coi giá trị rỗng/undefined là 0', () => {
    expect(computeRemaining(undefined as unknown as number, undefined as unknown as number)).toBe(0);
  });
});

describe('computeRemainingWithLegacyStatus', () => {
  it('coi phiếu đã paid nhưng chưa có bản ghi thanh toán nào là hết nợ (dữ liệu lịch sử)', () => {
    expect(computeRemainingWithLegacyStatus(10000000, 0, 'paid')).toBe(0);
  });

  it('vẫn tính đúng nợ còn lại khi đã có bản ghi thanh toán thật, dù trạng thái là gì', () => {
    expect(computeRemainingWithLegacyStatus(10000000, 4000000, 'paid')).toBe(6000000);
    expect(computeRemainingWithLegacyStatus(10000000, 4000000, 'partial')).toBe(6000000);
  });

  it('phiếu unpaid không có payments vẫn tính đủ nợ', () => {
    expect(computeRemainingWithLegacyStatus(10000000, 0, 'unpaid')).toBe(10000000);
  });
});
