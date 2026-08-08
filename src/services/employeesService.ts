import { supabase } from '../lib/supabase';
import { runQuery, MAX_ROWS, type DateRangeFilter } from '../lib/serviceError';
import type { Employee, Attendance } from '../types';
import { today } from '../lib/date';

export const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'emp-001', name: 'Phạm Xuân Tú', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-002', name: 'Võ Thị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-003', name: 'Trần Quốc Mạnh', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-004', name: 'Phan Văn Hoàng', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-005', name: 'Bùi Xuân Lệ', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-006', name: 'Anh Tiếp', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-007', name: 'Anh Tam', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
  { id: 'emp-008', name: 'Chị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
];

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    try {
      const data = await runQuery<Employee[]>('tải danh sách nhân viên', () =>
        supabase.from('employees').select('*').order('name', { ascending: true }),
      );
      if (data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Lỗi hoặc chưa phân quyền RLS cho employees, dùng danh sách mặc định:', err);
    }
    return DEFAULT_EMPLOYEES;
  },

  async create(employee: Partial<Employee>): Promise<Employee> {
    return runQuery<Employee>('thêm nhân viên', () =>
      supabase
        .from('employees')
        .insert({
          name: employee.name,
          role: employee.role || 'grinder',
          daily_salary: Number(employee.daily_salary) || 0,
          phone: employee.phone || null,
          address: employee.address || null,
          join_date: employee.join_date || today(),
          status: employee.status || 'active',
          notes: employee.notes || null,
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
          name: employee.name,
          role: employee.role,
          daily_salary: Number(employee.daily_salary) || 0,
          phone: employee.phone || null,
          address: employee.address || null,
          join_date: employee.join_date,
          status: employee.status,
          notes: employee.notes || null,
        })
        .eq('id', id)
        .select('id')
        .single(),
    );
  },

  async delete(id: string): Promise<void> {
    await runQuery('xoá nhân viên', () =>
      supabase.from('employees').delete().eq('id', id).select('id').single(),
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

    return data.map((item) => ({
      id: item.id,
      date: item.date,
      employee_id: item.employee_id,
      employee_name: item.employees?.name || 'Công nhân',
      work_shift: Number(item.work_shift) || 1,
      overtime_hours: Number(item.overtime_hours) || 0,
      daily_pay: Number(item.daily_pay) || 0,
      advance_pay: Number(item.advance_pay) || 0,
      net_pay: Number(item.net_pay) || 0,
      payment_status: item.payment_status || 'unpaid',
      notes: item.notes,
      created_at: item.created_at,
    }));
  },

  async createAttendance(att: Partial<Attendance>): Promise<Attendance> {
    const data = await runQuery<any>('lưu lượt chấm công', () =>
      supabase
        .from('attendance')
        .insert({
          date: att.date || today(),
          employee_id: att.employee_id || null,
          work_shift: Number(att.work_shift) || 1,
          overtime_hours: Number(att.overtime_hours) || 0,
          daily_pay: Number(att.daily_pay) || 0,
          advance_pay: Number(att.advance_pay) || 0,
          payment_status: att.payment_status || 'unpaid',
          notes: att.notes || null,
        })
        .select('*, employees(name)')
        .single(),
    );

    return {
      id: data.id,
      date: data.date,
      employee_id: data.employee_id,
      employee_name: data.employees?.name || att.employee_name || 'Công nhân',
      work_shift: Number(data.work_shift) || 1,
      overtime_hours: Number(data.overtime_hours) || 0,
      daily_pay: Number(data.daily_pay) || 0,
      advance_pay: Number(data.advance_pay) || 0,
      net_pay: Number(data.net_pay) || 0,
      payment_status: data.payment_status,
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async updateAttendance(id: string, att: Partial<Attendance>): Promise<void> {
    await runQuery('cập nhật lượt chấm công', () =>
      supabase
        .from('attendance')
        .update({
          date: att.date,
          employee_id: att.employee_id || null,
          work_shift: Number(att.work_shift) || 1,
          overtime_hours: Number(att.overtime_hours) || 0,
          daily_pay: Number(att.daily_pay) || 0,
          advance_pay: Number(att.advance_pay) || 0,
          payment_status: att.payment_status,
          notes: att.notes || null,
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
        work_shift: Number(r.work_shift) || 0,
        overtime_hours: Number(r.overtime_hours) || 0,
        daily_pay: Number(r.daily_pay) || 0,
        advance_pay: Number(r.advance_pay) || 0,
        payment_status: r.payment_status || 'unpaid',
        notes: r.notes || null,
      };
      if (r.id) item.id = r.id;
      return item;
    });

    await runQuery('lưu bảng chấm công hàng ngày', () =>
      supabase.from('attendance').upsert(payload).select('id'),
    );
  },
};
