import { describe, it, expect } from 'vitest';
import { calculatePalletTare, calculateNetScrapWeight } from './palletUtils';

describe('palletUtils', () => {
  describe('calculatePalletTare', () => {
    it('tính đúng khối lượng trừ bì cho 5 loại pallet/lồng sắt', () => {
      expect(calculatePalletTare('none', 1)).toBe(0);
      expect(calculatePalletTare('sat', 1)).toBe(41);
      expect(calculatePalletTare('go', 1)).toBe(27);
      expect(calculatePalletTare('nhua', 1)).toBe(20);
      expect(calculatePalletTare('long_sat', 1)).toBe(81);
    });

    it('xử lý đúng edge cases: số lượng 0, âm, undefined', () => {
      expect(calculatePalletTare('sat', 0)).toBe(0);
      expect(calculatePalletTare('sat', -5)).toBe(0);
      expect(calculatePalletTare('sat', undefined)).toBe(41); // default quantity = 1
      expect(calculatePalletTare('none')).toBe(0);
    });
  });

  describe('calculateNetScrapWeight', () => {
    it('tính đúng khối lượng phế thực tế sau khi trừ bì lết', () => {
      expect(calculateNetScrapWeight(100, 'sat', 1)).toBe(59); // 100 - 41
      expect(calculateNetScrapWeight(100, 'none', 1)).toBe(100);
      expect(calculateNetScrapWeight(100, 'long_sat', 2)).toBe(0); // 100 - 162 = -62 -> 0
    });
  });
});
