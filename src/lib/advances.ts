import type { Advance, AdvancePurpose } from '../types';

export const advancePurposeLabels: Record<AdvancePurpose, string> = {
  unclassified: 'Chưa phân loại',
  workshop: 'Ứng chi xưởng',
  materials: 'Ứng mua nguyên liệu',
  payroll: 'Ứng lương',
  other: 'Ứng khác',
};

export function summarizeAdvances(rows: readonly Advance[]) {
  const byPurpose = Object.keys(advancePurposeLabels).map((purpose) => {
    const selected = rows.filter((row) => (row.purpose || 'unclassified') === purpose);
    const outgoing = selected.filter((row) => row.type === 'advance' || row.type === 'ung');
    const issued = outgoing.reduce((sum, row) => sum + Number(row.amount), 0);
    const returned = selected
      .filter((row) => row.type === 'settlement' || row.type === 'hoan')
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const accounted = outgoing.reduce((sum, row) => sum + (Number(row.accounted_amount) || 0), 0);
    const outstanding = outgoing.reduce((sum, row) => sum + (Number(row.outstanding_amount) || 0), 0);
    return {
      purpose: purpose as AdvancePurpose,
      issued,
      returned,
      net: issued - returned,
      accounted,
      outstanding,
    };
  });
  return {
    byPurpose,
    issued: byPurpose.reduce((sum, row) => sum + row.issued, 0),
    returned: byPurpose.reduce((sum, row) => sum + row.returned, 0),
    accounted: byPurpose.reduce((sum, row) => sum + row.accounted, 0),
    outstanding: byPurpose.reduce((sum, row) => sum + row.outstanding, 0),
    unclassified: byPurpose.find((row) => row.purpose === 'unclassified')!.issued,
  };
}
