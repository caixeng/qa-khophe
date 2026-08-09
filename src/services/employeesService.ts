import { supabase } from '../lib/supabase';
import { runQuery, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Employee, Attendance } from '../types';
import { monthRange, today } from '../lib/date';

function nonNegative(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function clean(value: unknown): string | null {
  const result = String(value ?? '').trim();
  return result || null;
}

export function normalizeAttendanceRecord(item: any, fallbackName?: string): Attendance {
  return {
    id: item.id,
    date: item.date,
    employee_id: item.employee_id || undefined,
    employee_name:
      item.employees?.name ||
      item.employee_name_snapshot ||
      fallbackName ||
      `Hồ sơ cũ #${String(item.id || '').slice(0, 6)}`,
    work_shift: nonNegative(item.work_shift),
    overtime_hours: nonNegative(item.overtime_hours),
    daily_pay: nonNegative(item.daily_pay),
    advance_pay: nonNegative(item.advance_pay),
    net_pay: Number(item.net_pay) || 0,
    payment_status: item.payment_status || 'unpaid',
    paid_at: item.paid_at || undefined,
    paid_by: item.paid_by || undefined,
    notes: item.notes || undefined,
    created_at: item.created_at,
  };
}

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    return runQuery<Employee[]>('tải danh sách nhân viên', () =>
      supabase.from('employees').select('*').order('status', { ascending: true }).order('name', { ascending: true }),
    );
  },

  async create(employee: Partial<Employee>): Promise<Employee> {
    return runQuery<Employee>('thêm nhân viên', () =>
      supabase
        .from('employees')
        .insert({
          name: clean(employee.name),
          role: employee.role || 'grinder',
          daily_salary: Number(employee.daily_salary) || 0,
          phone: clean(employee.phone),
          address: clean(employee.address),
          join_date: employee.join_date || today(),
          status: employee.status || 'active',
          notes: clean(employee.notes),
        })
        .select()
        .single(),
    );
  },

  async update(id: string, employee: Partial<Employee>): Promise<void> {
    await runQuery('cập nhật hồ sơ nhân viên', () =>
      supabase
        .from('employees')
        .update({
          name: clean(employee.name),
          role: employee.role,
          daily_salary: Number(employee.daily_salary) || 0,
          phone: clean(employee.phone),
          address: clean(employee.address),
          join_date: employee.join_date,
          status: employee.status,
          notes: clean(employee.notes),
        })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },

  async deactivate(id: string): Promise<void> {
    await runQuery('chuyển nhân viên sang trạng thái đã nghỉ', () =>
      supabase.from('employees').update({ status: 'inactive' }).eq('id', id).select('id').single(),
    );
  },
};

export const attendanceService = {
  async getAttendance(filter: DateRangeFilter = {}): Promise<Attendance[]> {
    const data = await runQuery<any[]>('tải bảng chấm công', () => {
      let q = supabase.from('attendance').select('*, employees(name)');
      if (filter.from) q = q.gte('date', filter.from);
      if (filter.to) q = q.lte('date', filter.to);
      return q.order('date', { ascending: false }).limit(filter.limit ?? MAX_ROWS);
    });

    return data.map((item) => normalizeAttendanceRecord(item));
  },

  async createAttendance(att: Partial<Attendance>): Promise<Attendance> {
    const data = await runQuery<any>('lưu lượt chấm công', () =>
      supabase
        .from('attendance')
        .insert({
          date: att.date || today(),
          employee_id: att.employee_id || null,
          work_shift: nonNegative(att.work_shift, 1),
          overtime_hours: nonNegative(att.overtime_hours),
          daily_pay: nonNegative(att.daily_pay),
          advance_pay: nonNegative(att.advance_pay),
          payment_status: att.payment_status || 'unpaid',
          paid_at: att.payment_status === 'paid' ? new Date().toISOString() : null,
          notes: clean(att.notes),
        })
        .select('*, employees(name)')
        .single(),
    );

    return normalizeAttendanceRecord(data, att.employee_name);
  },

  async updateAttendance(id: string, att: Partial<Attendance>): Promise<void> {
    await runQuery('cập nhật lượt chấm công', () =>
      supabase
        .from('attendance')
        .update({
          date: att.date,
          employee_id: att.employee_id || null,
          work_shift: nonNegative(att.work_shift, 1),
          overtime_hours: nonNegative(att.overtime_hours),
          daily_pay: nonNegative(att.daily_pay),
          advance_pay: nonNegative(att.advance_pay),
          payment_status: att.payment_status,
          paid_at: att.payment_status === 'paid' ? att.paid_at || new Date().toISOString() : null,
          notes: clean(att.notes),
        })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },

  async deleteAttendance(id: string): Promise<void> {
    await runQuery('xoá lượt chấm công', () =>
      supabase.from('attendance').delete().eq('id', id).select('id').single(),
    );
  },

  async batchUpsertAttendance(
    date: string,
    records: Array<{
      id?: string;
      employee_id: string;
      work_shift: number;
      overtime_hours?: number;
      daily_pay?: number;
      advance_pay?: number;
      payment_status?: string;
      notes?: string | null;
    }>,
  ): Promise<void> {
    if (records.length === 0) return;

    const payload = records.map((r) => {
      const item: Record<string, any> = {
        date,
        employee_id: r.employee_id,
        work_shift: nonNegative(r.work_shift),
        overtime_hours: nonNegative(r.overtime_hours),
        daily_pay: nonNegative(r.daily_pay),
        advance_pay: nonNegative(r.advance_pay),
        payment_status: r.payment_status || 'unpaid',
        notes: clean(r.notes),
      };
      if (r.id) item.id = r.id;
      return item;
    });

    await runQuery('lưu bảng chấm công hàng ngày', () =>
      supabase.from('attendance').upsert(payload).select('id'),
    );
  },

  async payMonthForEmployee(employeeId: string, month: string): Promise<void> {
    const { from: startDate } = monthRange(month);
    await runQuery('chốt thanh toán lương tháng cho nhân viên', () =>
      supabase.rpc('settle_employee_payroll', {
        p_employee_id: employeeId,
        p_period: startDate,
      }),
    );
  },
};
