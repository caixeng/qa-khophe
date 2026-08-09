import { describe, expect, it } from 'vitest';
import { monthRange, shiftISODate } from './date';

describe('monthRange', () => {
  it('trả đúng ngày cuối tháng thường và tháng nhuận', () => {
    expect(monthRange('2026-08')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('từ chối kỳ lương sai định dạng', () => {
    expect(() => monthRange('2026-13')).toThrow('Kỳ lương không hợp lệ');
  });
});
describe('shiftISODate', () => {
  it('dịch ngày đúng qua ranh giới tháng và năm', () => {
    expect(shiftISODate('2026-08-01', -1)).toBe('2026-07-31');
    expect(shiftISODate('2026-12-31', 1)).toBe('2027-01-01');
  });
});
