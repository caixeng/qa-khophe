import { describe, it, expect } from 'vitest';
import { formatNgay, formatKg, formatTien } from './utils';

describe('utils', () => {
  describe('formatNgay', () => {
    it('định dạng đúng ngày từ chuỗi hoặc Date', () => {
      expect(formatNgay('2026-10-06')).toBe('06/10/2026');
      expect(formatNgay(new Date(2026, 9, 6))).toBe('06/10/2026'); // Month is 0-indexed in Date
    });

    it('xử lý đúng edge cases: null, undefined, chuỗi rỗng', () => {
      expect(formatNgay(null)).toBe('');
      expect(formatNgay(undefined)).toBe('');
      expect(formatNgay('')).toBe('');
      expect(formatNgay('invalid-date')).toBe('invalid-date'); // fallback
    });
  });

  describe('formatKg', () => {
    it('định dạng đúng khối lượng', () => {
      // Vì Intl có thể định dạng khác nhau trên môi trường Node.js (space hoặc non-breaking space)
      // Ta dùng toContain hoặc replace các whitespace đặc biệt để kiểm tra
      const formatted = formatKg(1234.5);
      expect(formatted.replace(/\s/g, ' ')).toContain('kg');
      
      const parts = formatted.split(' ');
      const numberPart = parts[0];
      // Kiểm tra xem số có chứa dấu . hoặc , theo locale vi-VN (tuỳ môi trường có thể là 1.234,5)
      expect(numberPart).toMatch(/1[.,]234[.,]5/);
    });
  });

  describe('formatTien', () => {
    it('định dạng đúng tiền tệ', () => {
      const formatted = formatTien(1000000);
      expect(formatted).toMatch(/1[.,]000[.,]000/);
      expect(formatTien(0)).toBe('0');
    });
  });
});
