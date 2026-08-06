import { supabase } from '../lib/supabase';
import type { Employee, Attendance } from '../types';

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase.from('employees').select('*').order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
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

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, employee: Partial<Employee>): Promise<void> {
    const { error } = await supabase
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

    if (error) throw new Error(error.message);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export const attendanceService = {
  async getAttendance(): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, employees(name)')
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item) => ({
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
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        date: att.date || new Date().toISOString().split('T')[0],
        employee_id: att.employee_id || null,
        work_shift: Number(att.work_shift) || 1,
        overtime_hours: Number(att.overtime_hours) || 0,
        daily_pay: Number(att.daily_pay) || 0,
        advance_pay: Number(att.advance_pay) || 0,
        payment_status: att.payment_status || 'unpaid',
        notes: att.notes || null,
      })
      .select('*, employees(name)')
      .single();

    if (error) throw new Error(error.message);

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
    const { error } = await supabase
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
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  async deleteAttendance(id: string): Promise<void> {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
