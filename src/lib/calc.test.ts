import { describe, it, expect } from 'vitest';
import { computeInventory, computeRemaining, computeRemainingWithLegacyStatus } from './calc';

describe('computeInventory', () => {
  it('tồn kho = đã xay ra trừ đã xuất bán', () => {
    expect(computeInventory(10_000, 4_000, 900)).toEqual({
      currentStockKg: 6_000,
      currentBags: 7, // 6000 / 900 = 6.67 -> làm tròn 7
    });
  });

  it('không bao giờ trả tồn kho âm dù xuất nhiều hơn xay', () => {
    // Tình huống thật: phiếu xay bị xoá nhầm hoặc nhập thiếu.
    // Hiện số âm ở màn hình kho chỉ gây hoang mang, kẹp về 0 rõ nghĩa hơn.
    const r = computeInventory(1_000, 5_000, 900);
    expect(r.currentStockKg).toBe(0);
    expect(r.currentBags).toBe(0);
  });

  it('kgPerBag bằng 0 không làm vỡ phép chia', () => {
    const r = computeInventory(5_000, 0, 0);
    expect(r.currentStockKg).toBe(5_000);
    expect(r.currentBags).toBe(0);
  });

  it('kho rỗng trả về 0', () => {
    expect(computeInventory(0, 0, 900)).toEqual({ currentStockKg: 0, currentBags: 0 });
  });

  it('cộng tồn kho đầu kỳ vào tổng — xưởng đã hoạt động trước khi dùng app', () => {
    // Đã có sẵn 20.000kg trước khi bắt đầu ghi nhận phiếu xay/xuất trên hệ thống.
    const r = computeInventory(10_000, 4_000, 900, 20_000);
    expect(r.currentStockKg).toBe(26_000); // 20.000 + 10.000 - 4.000
  });

  it('không cấu hình tồn kho đầu kỳ thì mặc định 0, không đổi hành vi cũ', () => {
    expect(computeInventory(10_000, 4_000, 900)).toEqual(computeInventory(10_000, 4_000, 900, 0));
  });
});

describe('computeRemaining', () => {
  it('nợ còn lại = tổng tiền trừ đã trả', () => {
    expect(computeRemaining(10_000_000, 4_000_000)).toBe(6_000_000);
  });

  it('trả dư không sinh ra nợ âm', () => {
    expect(computeRemaining(5_000_000, 7_000_000)).toBe(0);
  });

  it('coi giá trị không hợp lệ là 0 thay vì trả về NaN', () => {
    // NaN lọt vào tổng công nợ sẽ làm hỏng toàn bộ con số trên màn hình,
    // và người dùng không có cách nào biết dòng nào gây ra.
    expect(computeRemaining(NaN, 0)).toBe(0);
    expect(computeRemaining(1_000, NaN)).toBe(1_000);
  });
});

describe('computeRemainingWithLegacyStatus', () => {
  it('phiếu cũ đánh dấu "paid" nhưng chưa có sổ thanh toán được coi là hết nợ', () => {
    // Dữ liệu trước khi bảng payments ra đời không có bản ghi thanh toán nào.
    // Nếu chỉ dựa vào sổ, mọi phiếu cũ đã trả sẽ hiện nợ nguyên giá trị.
    expect(computeRemainingWithLegacyStatus(10_000_000, 0, 'paid')).toBe(0);
  });

  it('ưu tiên số liệu thật từ sổ thanh toán khi đã có', () => {
    expect(computeRemainingWithLegacyStatus(10_000_000, 3_000_000, 'paid')).toBe(7_000_000);
  });

  it('phiếu chưa trả vẫn còn nợ nguyên giá trị', () => {
    expect(computeRemainingWithLegacyStatus(10_000_000, 0, 'unpaid')).toBe(10_000_000);
  });

  it('phiếu trả một phần tính theo số đã trả', () => {
    expect(computeRemainingWithLegacyStatus(10_000_000, 2_500_000, 'partial')).toBe(7_500_000);
  });

  it('thiếu trạng thái thanh toán thì tính theo số đã trả', () => {
    expect(computeRemainingWithLegacyStatus(10_000_000, 1_000_000, undefined)).toBe(9_000_000);
  });
});
