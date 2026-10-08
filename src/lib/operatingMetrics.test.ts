import { describe, expect, it } from 'vitest';
import { summarizeOperations } from './operatingMetrics';

describe('operating metrics', () => {
  it('matches the independently queried 09/09–08/10 report totals', () => {
    const result = summarizeOperations({
      imports: [{ quantity_kg: 265248, total_amount: 1275652500 }],
      exports: [{ total_kg: 195496.5, total_amount: 1151090000 }],
      expenses: [{ amount: 1707000 }],
      attendance: [{ work_shift: 1, daily_pay: 5080000 }],
    });
    expect(result.totalOperatingCost).toBe(6787000);
    expect(result.estimatedProfit).toBe(-131349500);
  });

  it('counts earned wages including overtime; advances do not reduce operating cost', () => {
    const result = summarizeOperations({
      imports: [],
      exports: [],
      expenses: [{ amount: 100000 }],
      attendance: [
        { work_shift: 1, daily_pay: 400000, overtime_hours: 2, advance_pay: 600000, net_pay: 0 },
        { work_shift: 0, daily_pay: 400000, advance_pay: 200000, net_pay: 0 },
      ],
    });
    expect(result.totalPayrollCost).toBe(550000);
    expect(result.totalOperatingCost).toBe(650000);
  });

  it('has zero totals for an empty period', () => {
    const result = summarizeOperations({ imports: [], exports: [], expenses: [], attendance: [] });
    expect(Object.values(result).every((value) => value === 0)).toBe(true);
  });
});
