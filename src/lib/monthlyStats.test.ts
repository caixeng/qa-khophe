import { describe, it, expect } from 'vitest';
import {
  getRecentMonths,
  formatMonthLabel,
  formatCompactWeight,
  formatCompactMoney,
  computeGrowth,
  aggregateMonthlyStats,
} from './monthlyStats';

describe('monthlyStats utilities', () => {
  it('getRecentMonths generates consecutive YYYY-MM in ascending order', () => {
    const anchor = new Date('2026-10-15T00:00:00');
    const months = getRecentMonths(6, anchor);
    expect(months).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('formatMonthLabel formats standard and short labels correctly', () => {
    expect(formatMonthLabel('2026-10', false)).toBe('Thg 10/26');
    expect(formatMonthLabel('2026-10', true)).toBe('T10');
    expect(formatMonthLabel('2026-05', false)).toBe('Thg 5/26');
    expect(formatMonthLabel('2026-05', true)).toBe('T5');
  });

  it('formatCompactWeight formats weights for mobile axis', () => {
    expect(formatCompactWeight(0)).toBe('0');
    expect(formatCompactWeight(450)).toBe('450kg');
    expect(formatCompactWeight(1200)).toBe('1.2t');
    expect(formatCompactWeight(15000)).toBe('15t');
  });

  it('formatCompactMoney formats VND currency for mobile axis', () => {
    expect(formatCompactMoney(0)).toBe('0');
    expect(formatCompactMoney(500000)).toBe('500k');
    expect(formatCompactMoney(12000000)).toBe('12 tr');
    expect(formatCompactMoney(1500000000)).toBe('1.5 tỷ');
  });

  it('computeGrowth handles percentage change and edge cases', () => {
    expect(computeGrowth(150, 100)).toEqual({ pct: 50, diff: 50 });
    expect(computeGrowth(80, 100)).toEqual({ pct: -20, diff: -20 });
    expect(computeGrowth(100, 0)).toEqual({ pct: null, diff: 100 });
  });

  it('aggregateMonthlyStats correctly aggregates volume, revenue, costs, and profit', () => {
    const months = ['2026-09', '2026-10'];
    const imports = [
      { date: '2026-09-10', quantity_kg: 1000, total_amount: 10_000_000 },
      { date: '2026-10-02', quantity_kg: 2500, total_amount: 25_000_000 },
      { date: '2026-10-03', quantity_kg: 1500, total_amount: 15_000_000 },
    ];
    const exports = [
      { date: '2026-09-15', total_kg: 800, bags_count: 10, total_amount: 16_000_000 },
      { date: '2026-10-04', total_kg: 3000, bags_count: 35, total_amount: 60_000_000 },
    ];
    const grinding = [
      { date: '2026-09-12', output_qty_kg: 900 },
      { date: '2026-10-03', output_qty_kg: 3500 },
    ];
    const expenses = [
      { date: '2026-09-20', amount: 2_000_000 },
      { date: '2026-10-01', amount: 5_000_000 },
    ];
    const attendance = [{ date: '2026-10-05', net_pay: 3_000_000 }];

    const result = aggregateMonthlyStats({
      months,
      imports,
      exports,
      grinding,
      expenses,
      attendance,
    });

    expect(result).toHaveLength(2);

    // Tháng 9
    expect(result[0].month).toBe('2026-09');
    expect(result[0].importKg).toBe(1000);
    expect(result[0].exportKg).toBe(800);
    expect(result[0].groundKg).toBe(900);
    expect(result[0].exportBags).toBe(10);
    expect(result[0].importCost).toBe(10_000_000);
    expect(result[0].revenue).toBe(16_000_000);
    expect(result[0].operatingCost).toBe(2_000_000);
    // profit = 16M - 10M - 2M = 4M
    expect(result[0].profit).toBe(4_000_000);

    // Tháng 10
    expect(result[1].month).toBe('2026-10');
    expect(result[1].importKg).toBe(4000);
    expect(result[1].exportKg).toBe(3000);
    expect(result[1].groundKg).toBe(3500);
    expect(result[1].exportBags).toBe(35);
    expect(result[1].importCost).toBe(40_000_000);
    expect(result[1].revenue).toBe(60_000_000);
    // operatingCost = 5M (expenses) + 3M (attendance) = 8M
    expect(result[1].operatingCost).toBe(8_000_000);
    expect(result[1].profit).toBe(12_000_000);
  });

  it('kiểm tra advance_pay có được cộng vào operating cost không', () => {
    const result = aggregateMonthlyStats({
      months: ['2026-10'],
      imports: [],
      exports: [],
      grinding: [],
      expenses: [],
      attendance: [{ date: '2026-10-05', net_pay: 3_000_000, advance_pay: 1_000_000 }],
    });

    // operatingCost = net_pay + advance_pay = 4_000_000
    expect(result[0].operatingCost).toBe(4_000_000);
  });
});
