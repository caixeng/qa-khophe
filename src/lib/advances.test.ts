import { describe, expect, it } from 'vitest';
import { summarizeAdvances } from './advances';

describe('advance accounting', () => {
  it('separates payroll and workshop advances, including refunds and actual reconciliation', () => {
    const result = summarizeAdvances([
      {
        id: 'a',
        date: '2026-09-17',
        type: 'advance',
        purpose: 'payroll',
        amount: 10000000,
        accounted_amount: 10000000,
        outstanding_amount: 0,
      },
      {
        id: 'b',
        date: '2026-09-21',
        type: 'advance',
        purpose: 'payroll',
        amount: 5000000,
        accounted_amount: 0,
        outstanding_amount: 5000000,
      },
      {
        id: 'c',
        date: '2026-09-21',
        type: 'advance',
        purpose: 'workshop',
        amount: 1000,
        accounted_amount: 600,
        outstanding_amount: 0,
      },
      { id: 'd', date: '2026-09-22', type: 'settlement', purpose: 'workshop', amount: 400 },
    ]);
    expect(result.byPurpose.find((row) => row.purpose === 'payroll')?.issued).toBe(15000000);
    expect(result.byPurpose.find((row) => row.purpose === 'workshop')).toMatchObject({
      issued: 1000,
      returned: 400,
      net: 600,
      accounted: 600,
      outstanding: 0,
    });
    expect(result.outstanding).toBe(5000000);
  });
  it('keeps legacy uncategorized transactions explicit instead of assuming workshop costs', () => {
    const result = summarizeAdvances([
      { id: 'a', date: '2026-10-01', type: 'ung', amount: 15000000, outstanding_amount: 15000000 },
    ]);
    expect(result.unclassified).toBe(15000000);
    expect(result.byPurpose.find((row) => row.purpose === 'workshop')?.issued).toBe(0);
  });
});
