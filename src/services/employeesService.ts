import { supabase } from '../lib/supabase';
import type { Employee, Attendance } from '../types';
import { loadLocalData, saveLocalData } from '../lib/storage';

let LOCAL_EMPLOYEES: Employee[] = loadLocalData('khophe_employees', []);
let LOCAL_ATTENDANCE: Attendance[] = loadLocalData('khophe_attendance', []);

export const employeesService = {
  async getAll(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        LOCAL_EMPLOYEES = data;
        saveLocalData('khophe_employees', LOCAL_EMPLOYEES);
        return data;
      }
    } catch {}

    LOCAL_EMPLOYEES = loadLocalData('khophe_employees', LOCAL_EMPLOYEES);
    return LOCAL_EMPLOYEES;
  },

  async create(employee: Partial<Employee>): Promise<Employee> {
    let created: Employee | null = null;
    try {
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

      if (!error && data) {
        created = data;
      }
    } catch {}

    if (!created) {
      created = {
        id: `emp-${Date.now()}`,
        name: employee.name || 'Công nhân',
        role: employee.role || 'grinder',
        daily_salary: Number(employee.daily_salary) || 0,
        phone: employee.phone || '',
        address: employee.address || '',
        join_date: employee.join_date || new Date().toISOString().split('T')[0],
        status: employee.status || 'active',
        notes: employee.notes || undefined,
      };
    }

    LOCAL_EMPLOYEES.unshift(created);
    saveLocalData('khophe_employees', LOCAL_EMPLOYEES);
    return created;
  },

  async update(id: string, employee: Partial<Employee>): Promise<void> {
    const index = LOCAL_EMPLOYEES.findIndex(e => e.id === id);
    if (index !== -1) {
      LOCAL_EMPLOYEES[index] = {
        ...LOCAL_EMPLOYEES[index],
        ...employee,
      };
      saveLocalData('khophe_employees', LOCAL_EMPLOYEES);
    }

    try {
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
    } catch {}
  },

  async delete(id: string): Promise<void> {
    LOCAL_EMPLOYEES = LOCAL_EMPLOYEES.filter(e => e.id !== id);
    saveLocalData('khophe_employees', LOCAL_EMPLOYEES);
    try {
      await supabase.from('employees').delete().eq('id', id);
    } catch {}
  }
};

export const attendanceService = {
  async getAttendance(): Promise<Attendance[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name)')
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(item => ({
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
        LOCAL_ATTENDANCE = mapped;
        saveLocalData('khophe_attendance', LOCAL_ATTENDANCE);
        return mapped;
      }
    } catch {}

    LOCAL_ATTENDANCE = loadLocalData('khophe_attendance', LOCAL_ATTENDANCE);
    return LOCAL_ATTENDANCE;
  },

  async createAttendance(att: Partial<Attendance>): Promise<Attendance> {
    let created: Attendance | null = null;
    try {
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

      if (!error && data) {
        created = {
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
      }
    } catch {}

    if (!created) {
      created = {
        id: `att-${Date.now()}`,
        date: att.date || new Date().toISOString().split('T')[0],
        employee_id: att.employee_id,
        employee_name: att.employee_name || 'Công nhân',
        work_shift: Number(att.work_shift) || 1,
        overtime_hours: Number(att.overtime_hours) || 0,
        daily_pay: Number(att.daily_pay) || 0,
        advance_pay: Number(att.advance_pay) || 0,
        net_pay: (Number(att.daily_pay) || 0) - (Number(att.advance_pay) || 0),
        payment_status: att.payment_status || 'unpaid',
        notes: att.notes,
      };
    }

    LOCAL_ATTENDANCE.unshift(created);
    saveLocalData('khophe_attendance', LOCAL_ATTENDANCE);
    return created;
  },

  async updateAttendance(id: string, att: Partial<Attendance>): Promise<void> {
    const index = LOCAL_ATTENDANCE.findIndex(a => a.id === id);
    if (index !== -1) {
      LOCAL_ATTENDANCE[index] = {
        ...LOCAL_ATTENDANCE[index],
        ...att,
      };
      saveLocalData('khophe_attendance', LOCAL_ATTENDANCE);
    }

    try {
      await supabase
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
    } catch {}
  },

  async deleteAttendance(id: string): Promise<void> {
    LOCAL_ATTENDANCE = LOCAL_ATTENDANCE.filter(a => a.id !== id);
    saveLocalData('khophe_attendance', LOCAL_ATTENDANCE);
    try {
      await supabase.from('attendance').delete().eq('id', id);
    } catch {}
  }
};
