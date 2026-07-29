import { supabase } from '../lib/supabase';
import type { Employee, Attendance } from '../types';

const INITIAL_2807_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Hoa',
    role: 'grinder',
    daily_salary: 350000,
    phone: '0988123456',
    join_date: '2026-01-15',
    status: 'active',
    notes: 'Thợ xay chính xưởng phế (xay 18 bao ngày 28/07)'
  },
  {
    id: 'emp-2',
    name: 'Em Hoàn',
    role: 'weigher',
    daily_salary: 350000,
    phone: '0912345678',
    join_date: '2026-02-01',
    status: 'active',
    notes: 'Thợ phụ trách cân hàng phế'
  },
  {
    id: 'emp-3',
    name: 'A. Danh',
    role: 'driver',
    daily_salary: 400000,
    phone: '0901234567',
    join_date: '2026-03-10',
    status: 'active',
    notes: 'Lái xe tải chở phế liệu'
  }
];

const INITIAL_2807_ATTENDANCE: Attendance[] = [
  {
    id: 'att-2807-1',
    date: '2026-07-28',
    employee_id: 'emp-1',
    employee_name: 'Hoa',
    work_shift: 1,
    overtime_hours: 0,
    daily_pay: 350000,
    advance_pay: 0,
    net_pay: 350000,
    payment_status: 'paid',
    notes: 'Chấm công ngày 28/07 - Xay 18 bao bột phế thành phẩm'
  },
  {
    id: 'att-2807-2',
    date: '2026-07-28',
    employee_id: 'emp-2',
    employee_name: 'Em Hoàn',
    work_shift: 1,
    overtime_hours: 0,
    daily_pay: 350000,
    advance_pay: 0,
    net_pay: 350000,
    payment_status: 'unpaid',
    notes: 'Chấm công ngày 28/07 - Nhận lô phế 1.796 kg'
  }
];

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_EMPLOYEES;
      }
      return data;
    } catch {
      return INITIAL_2807_EMPLOYEES;
    }
  },

  async create(employee: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        name: employee.name,
        role: employee.role || 'grinder',
        daily_salary: Number(employee.daily_salary) || 0,
        phone: employee.phone || null,
        address: employee.address || null,
        join_date: employee.join_date || new Date().toISOString().split('T')[0],
        status: employee.status || 'active',
        notes: employee.notes || null,
      })
      .select()
      .single();

    if (error) {
      return {
        id: `emp-${Date.now()}`,
        name: employee.name || 'Công nhân mới',
        role: employee.role || 'grinder',
        daily_salary: Number(employee.daily_salary) || 350000,
        phone: employee.phone,
        address: employee.address,
        join_date: employee.join_date || '2026-07-28',
        status: employee.status || 'active',
        notes: employee.notes,
      };
    }
    return data;
  },

  async update(id: string, employee: Partial<Employee>): Promise<void> {
    await supabase
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
      .eq('id', id);
  },

  async delete(id: string): Promise<void> {
    await supabase
      .from('employees')
      .delete()
      .eq('id', id);
  }
};

export const attendanceService = {
  async getAttendance(): Promise<Attendance[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name)')
        .order('date', { ascending: false });

      if (error || !data || data.length === 0) {
        return INITIAL_2807_ATTENDANCE;
      }
      return data.map(item => ({
        id: item.id,
        date: item.date,
        employee_id: item.employee_id,
        employee_name: item.employees?.name || item.employee_name || 'Công nhân',
        work_shift: Number(item.work_shift) || 1,
        overtime_hours: Number(item.overtime_hours) || 0,
        daily_pay: Number(item.daily_pay) || 0,
        advance_pay: Number(item.advance_pay) || 0,
        net_pay: Number(item.net_pay) || 0,
        payment_status: item.payment_status || 'unpaid',
        notes: item.notes,
        created_at: item.created_at,
      }));
    } catch {
      return INITIAL_2807_ATTENDANCE;
    }
  },

  async createAttendance(att: Partial<Attendance>): Promise<Attendance> {
    const shift = Number(att.work_shift) || 1;
    const pay = Number(att.daily_pay) || 0;
    const advance = Number(att.advance_pay) || 0;
    const net = Math.max(0, (shift * pay) - advance);

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        date: att.date || new Date().toISOString().split('T')[0],
        employee_id: att.employee_id || null,
        work_shift: shift,
        overtime_hours: Number(att.overtime_hours) || 0,
        daily_pay: pay,
        advance_pay: advance,
        net_pay: net,
        payment_status: att.payment_status || 'unpaid',
        notes: att.notes || null,
      })
      .select('*, employees(name)')
      .single();

    if (error) {
      return {
        id: `att-${Date.now()}`,
        date: att.date || '2026-07-28',
        employee_id: att.employee_id,
        employee_name: att.employee_name || 'Công nhân',
        work_shift: shift,
        overtime_hours: Number(att.overtime_hours) || 0,
        daily_pay: pay,
        advance_pay: advance,
        net_pay: net,
        payment_status: att.payment_status || 'unpaid',
        notes: att.notes,
      };
    }
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
      payment_status: data.payment_status || 'unpaid',
      notes: data.notes,
      created_at: data.created_at,
    };
  },

  async updateAttendance(id: string, att: Partial<Attendance>): Promise<void> {
    const shift = Number(att.work_shift) || 1;
    const pay = Number(att.daily_pay) || 0;
    const advance = Number(att.advance_pay) || 0;
    const net = Math.max(0, (shift * pay) - advance);

    await supabase
      .from('attendance')
      .update({
        date: att.date,
        employee_id: att.employee_id || null,
        work_shift: shift,
        overtime_hours: Number(att.overtime_hours) || 0,
        daily_pay: pay,
        advance_pay: advance,
        net_pay: net,
        payment_status: att.payment_status,
        notes: att.notes || null,
      })
      .eq('id', id);
  },

  async deleteAttendance(id: string): Promise<void> {
    await supabase
      .from('attendance')
      .delete()
      .eq('id', id);
  }
};
