import { describe, it, expect } from 'vitest';
import { computePayroll } from './payroll';
import type { Attendance } from '../types';

function att(p: Partial<Attendance>): Attendance {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-08-01',
    employee_name: 'Hoa',
    work_shift: 1,
    daily_pay: 350_000,
    net_pay: 350_000,
    payment_status: 'unpaid',
    ...p,
  } as Attendance;
}

describe('computePayroll', () => {
  it('cộng dồn nhiều ngày công của cùng một người', () => {
    const r = computePayroll(
      [
        att({ date: '2026-08-01', employee_id: 'e1' }),
        att({ date: '2026-08-02', employee_id: 'e1' }),
        att({ date: '2026-08-03', employee_id: 'e1', work_shift: 0.5, net_pay: 175_000 }),
      ],
      '2026-08',
    );

    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].shifts).toBe(2.5);
    expect(r.rows[0].gross).toBe(875_000);
    expect(r.rows[0].net).toBe(875_000);
  });

  it('chỉ tính các lượt trong đúng tháng đã chọn', () => {
    const r = computePayroll(
      [
        att({ date: '2026-07-31', employee_id: 'e1' }),
        att({ date: '2026-08-01', employee_id: 'e1' }),
        att({ date: '2026-09-01', employee_id: 'e1' }),
      ],
      '2026-08',
    );

    expect(r.totals.shifts).toBe(1);
    expect(r.totals.net).toBe(350_000);
  });

  it('hai người trùng tên vẫn là hai dòng lương riêng', () => {
    // Nếu gom theo tên, hai anh cùng tên "Hoa" sẽ bị trả gộp vào một người.
    const r = computePayroll(
      [
        att({ employee_id: 'e1', employee_name: 'Hoa' }),
        att({ employee_id: 'e2', employee_name: 'Hoa' }),
      ],
      '2026-08',
    );

    expect(r.rows).toHaveLength(2);
    expect(r.totals.net).toBe(700_000);
  });

  it('gom theo tên khi chấm công không gắn hồ sơ nhân viên', () => {
    const r = computePayroll(
      [att({ employee_name: 'Công nhật A' }), att({ employee_name: 'Công nhật A' })],
      '2026-08',
    );

    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].shifts).toBe(2);
  });

  it('chỉ trạng thái "paid" mới hết nợ — "partial" vẫn còn phải trả', () => {
    // Trả một phần mà coi như xong thì đến cuối tháng sẽ thiếu tiền công nhân.
    const r = computePayroll(
      [
        att({ employee_id: 'e1', payment_status: 'paid' }),
        att({ employee_id: 'e2', payment_status: 'partial' }),
        att({ employee_id: 'e3', payment_status: 'unpaid' }),
      ],
      '2026-08',
    );

    expect(r.totals.net).toBe(1_050_000);
    expect(r.totals.unpaid).toBe(700_000);
  });

  it('cộng riêng tiền đã ứng', () => {
    const r = computePayroll(
      [att({ employee_id: 'e1', advance_pay: 200_000, net_pay: 150_000 })],
      '2026-08',
    );

    expect(r.rows[0].advance).toBe(200_000);
    expect(r.rows[0].gross).toBe(350_000);
    expect(r.rows[0].net).toBe(150_000);
  });

  it('xếp người lĩnh nhiều nhất lên đầu', () => {
    const r = computePayroll(
      [
        att({ employee_id: 'e1', employee_name: 'Ít', net_pay: 100_000 }),
        att({ employee_id: 'e2', employee_name: 'Nhiều', net_pay: 900_000 }),
      ],
      '2026-08',
    );

    expect(r.rows.map((x) => x.name)).toEqual(['Nhiều', 'Ít']);
  });

  it('tháng không có dữ liệu trả về bảng rỗng, không phải NaN', () => {
    const r = computePayroll([att({ date: '2026-08-01' })], '2026-12');
    expect(r.rows).toEqual([]);
    expect(r.totals).toEqual({ shifts: 0, gross: 0, advance: 0, net: 0, unpaid: 0 });
  });
});
