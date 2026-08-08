import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Phone,
  UserCheck,
  HardHat,
  Truck,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { cn, formatTien, formatNgay } from '../lib/utils';
import { computePayroll } from '../lib/payroll';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { KpiCard } from '../components/KpiCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/toast';
import { employeesService, attendanceService } from '../services/employeesService';
import type { Employee, Attendance, EmployeeRole, PaymentStatus } from '../types';

const roleLabels: Record<EmployeeRole, { label: string; icon: React.ElementType; color: string }> = {
  grinder: { label: 'Thợ xay phế', icon: HardHat, color: 'bg-amber-100 text-amber-900 border-amber-200' },
  weigher: { label: 'Thợ cân phế', icon: Scale, color: 'bg-blue-100 text-blue-900 border-blue-200' },
  driver: {
    label: 'Tài xế giao hàng',
    icon: Truck,
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  manager: {
    label: 'Quản lý xưởng',
    icon: ShieldCheck,
    color: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  staff: { label: 'Nhân viên xưởng', icon: Users, color: 'bg-slate-100 text-slate-900 border-slate-200' },
};

export const NhanVienPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');
  const { toast } = useToast();
  const [savingEmp, setSavingEmp] = useState(false);
  const [savingAtt, setSavingAtt] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    id: string;
    type: 'employee' | 'attendance';
  }>({ isOpen: false, id: '', type: 'employee' });

  const {
    data: employees,
    loading: empLoading,
    error: empError,
    refetch: refetchEmp,
  } = useAsyncList(employeesService.getAll, []);
  const {
    data: attendanceList,
    loading: attLoading,
    error: attError,
    refetch: refetchAtt,
  } = useAsyncList(attendanceService.getAttendance, []);

  const { searchQuery, setSearchQuery, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage } =
    useTableControls();

  // Employee Form State
  const {
    formState: empForm,
    openModal: openEmpModal,
    closeModal: closeEmpModal,
    handleChange: handleEmpChange,
  } = useCrudForm<Employee>({
    initialData: {
      name: '',
      role: 'grinder',
      daily_salary: 350000,
      phone: '',
      status: 'active',
    },
  });

  // Attendance Form State
  const {
    formState: attForm,
    openModal: openAttModal,
    closeModal: closeAttModal,
    handleChange: handleAttChange,
  } = useCrudForm<Attendance>({
    initialData: {
      date: new Date().toISOString().split('T')[0],
      work_shift: 1,
      overtime_hours: 0,
      daily_pay: 350000,
      advance_pay: 0,
      payment_status: 'unpaid',
    },
  });

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(q) || (e.phone && e.phone.includes(q)));
  }, [employees, searchQuery]);

  const filteredAttendance = useMemo(() => {
    if (!searchQuery) return attendanceList;
    const q = searchQuery.toLowerCase();
    return attendanceList.filter((a) => a.employee_name.toLowerCase().includes(q) || a.date.includes(q));
  }, [attendanceList, searchQuery]);

  // Attendance Statistics
  const attStats = useMemo(() => {
    const totalShifts = attendanceList.reduce((sum, a) => sum + (Number(a.work_shift) || 0), 0);
    const totalPayroll = attendanceList.reduce((sum, a) => sum + (Number(a.net_pay) || 0), 0);
    const totalPaid = attendanceList
      .filter((a) => a.payment_status === 'paid')
      .reduce((sum, a) => sum + (Number(a.net_pay) || 0), 0);
    const totalUnpaid = attendanceList
      .filter((a) => a.payment_status === 'unpaid')
      .reduce((sum, a) => sum + (Number(a.net_pay) || 0), 0);

    return { totalShifts, totalPayroll, totalPaid, totalUnpaid };
  }, [attendanceList]);

  // Kỳ lương đang xem, mặc định tháng hiện tại.
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const payroll = useMemo(() => computePayroll(attendanceList, payrollMonth), [attendanceList, payrollMonth]);

  // Handle Employee Save
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — tránh tạo trùng hồ sơ nhân viên.
    if (savingEmp) return;

    const data = empForm.data;
    if (!data.name?.trim()) {
      toast.warning('Vui lòng nhập tên nhân viên');
      return;
    }

    setSavingEmp(true);
    try {
      if (data.id) {
        await employeesService.update(data.id, data);
        toast.success('Đã cập nhật hồ sơ nhân viên');
      } else {
        await employeesService.create(data);
        toast.success('Đã thêm nhân viên mới');
      }
      closeEmpModal();
      refetchEmp();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu nhân viên');
      console.error('Lỗi khi lưu nhân viên:', err);
    } finally {
      setSavingEmp(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    setConfirmState({ isOpen: true, id, type: 'employee' });
  };

  const confirmDeleteEmployee = async () => {
    try {
      await employeesService.delete(confirmState.id);
      toast.success('Đã xóa hồ sơ nhân viên');
      refetchEmp();
    } catch (err) {
      toast.error('Lỗi khi xóa nhân viên');
      console.error('Lỗi khi xóa nhân viên:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'employee' });
  };

  // Handle Attendance Save
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — tránh chấm công trùng cho cùng một người.
    if (savingAtt) return;

    const data = attForm.data;
    if (!data.employee_id && !data.employee_name) {
      toast.warning('Vui lòng chọn nhân viên chấm công');
      return;
    }

    setSavingAtt(true);
    try {
      const emp = employees.find((x) => x.id === data.employee_id);
      const empName = emp ? emp.name : data.employee_name || 'Công nhân';
      const dailyPay = emp ? emp.daily_salary : data.daily_pay || 350000;

      if (data.id) {
        await attendanceService.updateAttendance(data.id, {
          ...data,
          employee_name: empName,
          daily_pay: dailyPay,
        });
        toast.success('Đã cập nhật lượt chấm công');
      } else {
        await attendanceService.createAttendance({
          ...data,
          employee_name: empName,
          daily_pay: dailyPay,
        });
        toast.success('Đã lưu lượt chấm công mới');
      }
      closeAttModal();
      refetchAtt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu lượt chấm công');
      console.error('Lỗi khi lưu lượt chấm công:', err);
    } finally {
      setSavingAtt(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    setConfirmState({ isOpen: true, id, type: 'attendance' });
  };

  const confirmDeleteAttendance = async () => {
    try {
      await attendanceService.deleteAttendance(confirmState.id);
      toast.success('Đã xóa lượt chấm công');
      refetchAtt();
    } catch (err) {
      toast.error('Lỗi khi xóa lượt chấm công');
      console.error('Lỗi khi xóa lượt chấm công:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'attendance' });
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Quản Lý Nhân Sự"
        subtitle="Quản lý hồ sơ công nhân xưởng phế, chấm công hàng ngày và tính lương công"
        action={{
          label: activeTab === 'employees' ? 'Thêm nhân viên' : 'Chấm công mới',
          icon: Plus,
          onClick: () => (activeTab === 'employees' ? openEmpModal() : openAttModal()),
        }}
      />

      {/* KPI Cards for Payroll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Tổng số nhân sự"
          value={`${employees.length} người`}
          subtitle={`${employees.filter((e) => e.status === 'active').length} đang làm việc`}
          icon={UserCheck}
          color="primary"
        />
        <KpiCard
          title="Tổng ngày công"
          value={`${attStats.totalShifts} công`}
          subtitle="Ghi nhận tháng này"
          icon={Calendar}
          color="info"
        />
        <KpiCard
          title="Tổng quỹ lương"
          value={formatTien(attStats.totalPayroll)}
          subtitle="Lương thực lĩnh"
          icon={DollarSign}
          color="success"
        />
        <KpiCard
          title="Lương chưa trả"
          value={formatTien(attStats.totalUnpaid)}
          subtitle="Cần thanh toán"
          icon={DollarSign}
          color="warning"
        />
      </div>

      {/* CIC-IBST Pill Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-surface)] p-1.5 rounded-xl shadow-xs border border-[var(--border-color)] w-fit">
        <button
          onClick={() => setActiveTab('employees')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'employees'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <Users
            size={14}
            className={activeTab === 'employees' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span>Danh sách nhân viên ({employees.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'attendance'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <Calendar
            size={14}
            className={activeTab === 'attendance' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span>Chấm công & Tính lương ({attendanceList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'payroll'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <DollarSign
            size={14}
            className={activeTab === 'payroll' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span>Bảng lương tháng</span>
        </button>
      </div>

      {/* Table Toolbar */}
      <TableToolbar
        placeholder={
          activeTab === 'employees' ? 'Tìm theo tên hoặc SĐT...' : 'Tìm theo tên công nhân hoặc ngày...'
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={activeTab === 'employees' ? filteredEmployees.length : filteredAttendance.length}
      />

      {/* TAB 1: DANH SÁCH NHÂN VIÊN */}
      {activeTab === 'employees' && (
        <DataState loading={empLoading} error={empError} isEmpty={filteredEmployees.length === 0}>
          <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Danh sách hồ sơ nhân viên</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">
                      Tên nhân viên
                    </th>
                    <th scope="col" className="th-cell">
                      Chức vụ
                    </th>
                    <th className="th-cell text-right">Lương công (đ/ngày)</th>
                    <th scope="col" className="th-cell">
                      Số điện thoại
                    </th>
                    <th scope="col" className="th-cell">
                      Trạng thái
                    </th>
                    <th scope="col" className="th-cell">
                      Ghi chú
                    </th>
                    <th className="th-cell text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((emp) => {
                      const roleInfo = roleLabels[emp.role] || roleLabels.staff;
                      const RoleIcon = roleInfo.icon;
                      return (
                        <tr key={emp.id} className="tr-hover">
                          <td className="td-cell font-bold text-xs text-[var(--text-primary)]">{emp.name}</td>
                          <td className="td-cell">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 w-fit',
                                roleInfo.color,
                              )}
                            >
                              <RoleIcon size={12} />
                              <span>{roleInfo.label}</span>
                            </span>
                          </td>
                          <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                            {formatTien(emp.daily_salary)}
                          </td>
                          <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                            {emp.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {emp.phone}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="td-cell">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                                emp.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-100 text-slate-900',
                              )}
                            >
                              {emp.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ'}
                            </span>
                          </td>
                          <td className="td-cell text-xs text-[var(--text-muted)] max-w-xs truncate">
                            {emp.notes || '—'}
                          </td>
                          <td className="td-cell text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openEmpModal(emp)}
                                className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                                title="Sửa"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-rose-600 cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </DataState>
      )}

      {/* TAB 2: CHẤM CÔNG & TÍNH LƯƠNG */}
      {activeTab === 'attendance' && (
        <DataState loading={attLoading} error={attError} isEmpty={filteredAttendance.length === 0}>
          <div className="card bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Bảng chấm công nhân viên</caption>
                <thead>
                  <tr>
                    <th scope="col" className="th-cell">
                      Ngày chấm công
                    </th>
                    <th scope="col" className="th-cell">
                      Tên công nhân
                    </th>
                    <th className="th-cell text-right">Số công</th>
                    <th className="th-cell text-right">Đơn giá/ngày</th>
                    <th className="th-cell text-right">Tạm ứng</th>
                    <th className="th-cell text-right">Thực lĩnh</th>
                    <th scope="col" className="th-cell">
                      Trạng thái thanh toán
                    </th>
                    <th scope="col" className="th-cell">
                      Ghi chú công
                    </th>
                    <th className="th-cell text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((att) => (
                      <tr key={att.id} className="tr-hover">
                        <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                          {formatNgay(att.date)}
                        </td>
                        <td className="td-cell font-bold text-xs text-[var(--text-primary)]">
                          {att.employee_name}
                        </td>
                        <td className="td-cell text-right font-mono font-bold text-xs text-[var(--primary-500)]">
                          {att.work_shift} công
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                          {formatTien(att.daily_pay)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-rose-600">
                          {att.advance_pay ? `-${formatTien(att.advance_pay)}` : '0 đ'}
                        </td>
                        <td className="td-cell text-right font-mono font-black text-xs text-emerald-600">
                          {formatTien(att.net_pay)}
                        </td>
                        <td className="td-cell">
                          <StatusBadge status={att.payment_status} />
                        </td>
                        <td className="td-cell text-xs text-[var(--text-muted)] max-w-xs truncate">
                          {att.notes || '—'}
                        </td>
                        <td className="td-cell text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openAttModal(att)}
                              className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                              title="Sửa"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAttendance(att.id)}
                              className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-rose-600 cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredAttendance.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </DataState>
      )}

      {/* TAB 3: BẢNG LƯƠNG THÁNG */}
      {activeTab === 'payroll' && (
        <DataState loading={attLoading} error={attError} isEmpty={false}>
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--primary-500)]" />
                <label htmlFor="payroll-month" className="text-xs font-bold text-[var(--text-secondary)]">
                  Kỳ lương tháng
                </label>
                <input
                  id="payroll-month"
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="text-[var(--text-muted)]">
                  Tổng công: <b className="font-mono text-[var(--text-primary)]">{payroll.totals.shifts}</b>
                </span>
                <span className="text-[var(--text-muted)]">
                  Thực lĩnh: <b className="font-mono text-emerald-600">{formatTien(payroll.totals.net)}</b>
                </span>
                <span className="text-[var(--text-muted)]">
                  Còn phải trả: <b className="font-mono text-rose-600">{formatTien(payroll.totals.unpaid)}</b>
                </span>
              </div>
            </div>

            {payroll.rows.length === 0 ? (
              <div className="card bg-[var(--bg-surface)] py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Chưa có lượt chấm công nào trong tháng này.
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Chọn tháng khác hoặc chấm công ở tab bên cạnh.
                </p>
              </div>
            ) : (
              <div className="erp-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Bảng lương tháng {payrollMonth}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="th-cell">
                          Nhân viên
                        </th>
                        <th className="th-cell text-right">Số công</th>
                        <th className="th-cell text-right">Lương gộp</th>
                        <th className="th-cell text-right">Đã ứng</th>
                        <th className="th-cell text-right">Thực lĩnh</th>
                        <th className="th-cell text-right">Còn phải trả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.rows.map((r) => (
                        <tr key={r.name} className="tr-hover">
                          <td className="td-cell text-xs font-bold text-[var(--text-primary)]">{r.name}</td>
                          <td className="td-cell text-right font-mono text-xs">{r.shifts}</td>
                          <td className="td-cell text-right font-mono text-xs">{formatTien(r.gross)}</td>
                          <td className="td-cell text-right font-mono text-xs text-amber-600">
                            {r.advance > 0 ? formatTien(r.advance) : '—'}
                          </td>
                          <td className="td-cell text-right font-mono text-xs font-bold text-[var(--primary-600)]">
                            {formatTien(r.net)}
                          </td>
                          <td
                            className={cn(
                              'td-cell text-right font-mono text-xs font-bold',
                              r.unpaid > 0 ? 'text-rose-600' : 'text-emerald-600',
                            )}
                          >
                            {r.unpaid > 0 ? formatTien(r.unpaid) : 'Đã trả đủ'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--bg-subtle)] font-bold">
                        <td className="td-cell text-xs uppercase">Tổng cộng</td>
                        <td className="td-cell text-right font-mono text-xs">{payroll.totals.shifts}</td>
                        <td className="td-cell text-right font-mono text-xs">
                          {formatTien(payroll.totals.gross)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-amber-600">
                          {formatTien(payroll.totals.advance)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-[var(--primary-600)]">
                          {formatTien(payroll.totals.net)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-rose-600">
                          {formatTien(payroll.totals.unpaid)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DataState>
      )}

      {/* MODAL 1: THÊM / SỬA NHÂN VIÊN */}
      <Modal
        isOpen={empForm.isOpen}
        onClose={closeEmpModal}
        title={empForm.data?.id ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm mới nhân viên xưởng phế'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <FormField label="Họ và tên nhân viên" required>
            <input
              type="text"
              required
              className="input-field font-bold"
              placeholder="Ví dụ: Hoa, Em Hoàn, Anh Danh..."
              value={empForm.data?.name || ''}
              onChange={(e) => handleEmpChange('name', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Chức vụ / Công việc" required>
              <select
                className="input-field"
                value={empForm.data?.role || 'grinder'}
                onChange={(e) => handleEmpChange('role', e.target.value as EmployeeRole)}
              >
                <option value="grinder">Thợ xay phế</option>
                <option value="weigher">Thợ cân phế</option>
                <option value="driver">Tài xế giao hàng</option>
                <option value="manager">Quản lý xưởng</option>
                <option value="staff">Nhân viên khác</option>
              </select>
            </FormField>

            <FormField label="Đơn giá lương công (đ/ngày)" required>
              <input
                type="number"
                inputMode="decimal"
                required
                min="0"
                step="10000"
                className="input-field font-mono font-bold"
                placeholder="350000"
                value={empForm.data?.daily_salary || ''}
                onChange={(e) => handleEmpChange('daily_salary', Number(e.target.value))}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số điện thoại liên hệ">
              <input
                type="tel"
                className="input-field font-mono"
                placeholder="0912..."
                value={empForm.data?.phone || ''}
                onChange={(e) => handleEmpChange('phone', e.target.value)}
              />
            </FormField>

            <FormField label="Trạng thái làm việc">
              <select
                className="input-field"
                value={empForm.data?.status || 'active'}
                onChange={(e) => handleEmpChange('status', e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Đang làm việc</option>
                <option value="inactive">Đã nghỉ việc</option>
              </select>
            </FormField>
          </div>

          <FormField label="Ghi chú thêm">
            <textarea
              className="input-field min-h-20"
              placeholder="Nhập ghi chú kỹ năng, tay nghề thợ..."
              value={empForm.data?.notes || ''}
              onChange={(e) => handleEmpChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeEmpModal} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingEmp}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingEmp ? 'Đang lưu...' : empForm.data?.id ? 'Cập nhật' : 'Thêm nhân viên'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CHẤM CÔNG & TÍNH LƯƠNG */}
      <Modal
        isOpen={attForm.isOpen}
        onClose={closeAttModal}
        title={attForm.data?.id ? 'Chỉnh sửa lượt chấm công' : 'Chấm công ngày cho nhân viên'}
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <FormField label="Ngày chấm công" required>
            <input
              type="date"
              required
              className="input-field"
              value={attForm.data?.date || ''}
              onChange={(e) => handleAttChange('date', e.target.value)}
            />
          </FormField>

          <FormField label="Chọn công nhân chấm công" required>
            <select
              className="input-field"
              value={attForm.data?.employee_id || ''}
              onChange={(e) => {
                const empId = e.target.value;
                handleAttChange('employee_id', empId);
                const selected = employees.find((x) => x.id === empId);
                if (selected) {
                  handleAttChange('employee_name', selected.name);
                  handleAttChange('daily_pay', selected.daily_salary);
                }
              }}
            >
              <option value="">-- Chọn công nhân --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {roleLabels[emp.role]?.label || emp.role} ({formatTien(emp.daily_salary)}/ngày)
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số ngày công" required>
              <select
                className="input-field font-mono font-bold"
                value={attForm.data?.work_shift || 1}
                onChange={(e) => handleAttChange('work_shift', Number(e.target.value))}
              >
                <option value={1}>1.0 công (Cả ngày)</option>
                <option value={0.5}>0.5 công (Nửa ngày)</option>
                <option value={1.5}>1.5 công (Tăng ca)</option>
                <option value={2}>2.0 công (2 ca)</option>
              </select>
            </FormField>

            <FormField label="Mức lương ngày (đ/ngày)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="10000"
                className="input-field font-mono font-bold text-[var(--primary-500)]"
                value={attForm.data?.daily_pay || ''}
                onChange={(e) => handleAttChange('daily_pay', Number(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="Tiền tạm ứng trước (nếu có)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="10000"
              className="input-field font-mono text-rose-600"
              placeholder="0"
              value={attForm.data?.advance_pay || ''}
              onChange={(e) => handleAttChange('advance_pay', Number(e.target.value))}
            />
          </FormField>

          {/* Computed Net Pay Preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex justify-between items-center text-xs">
            <span className="text-[var(--text-muted)] font-semibold">TỔNG THỰC LĨNH LƯƠNG:</span>
            <span className="font-mono font-black text-sm text-emerald-600">
              {formatTien(
                Math.max(
                  0,
                  (Number(attForm.data?.work_shift) || 1) * (Number(attForm.data?.daily_pay) || 350000) -
                    (Number(attForm.data?.advance_pay) || 0),
                ),
              )}
            </span>
          </div>

          <FormField label="Trạng thái thanh toán">
            <select
              className="input-field"
              value={attForm.data?.payment_status || 'unpaid'}
              onChange={(e) => handleAttChange('payment_status', e.target.value as PaymentStatus)}
            >
              <option value="unpaid">Chưa trả lương (Ghi nợ lương)</option>
              <option value="paid">Đã thanh toán đủ</option>
            </select>
          </FormField>

          <FormField label="Ghi chú công">
            <textarea
              className="input-field min-h-20"
              placeholder="Ghi nhận công việc xưởng phế thực hiện trong ngày..."
              value={attForm.data?.notes || ''}
              onChange={(e) => handleAttChange('notes', e.target.value)}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={closeAttModal} className="btn-secondary">
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingAtt}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingAtt ? 'Đang lưu...' : attForm.data?.id ? 'Cập nhật' : 'Lưu lượt chấm công'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '', type: 'employee' })}
        onConfirm={confirmState.type === 'employee' ? confirmDeleteEmployee : confirmDeleteAttendance}
        title={confirmState.type === 'employee' ? 'Xóa hồ sơ nhân viên' : 'Xóa lượt chấm công'}
        message={
          confirmState.type === 'employee'
            ? 'Bạn có chắc chắn muốn xóa hồ sơ nhân viên này? Hành động này không thể hoàn tác.'
            : 'Bạn có chắc chắn muốn xóa lượt chấm công này? Hành động này không thể hoàn tác.'
        }
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </div>
  );
};
