import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Clock,
  UserMinus,
} from 'lucide-react';
import { cn, formatTien, formatNgay } from '../lib/utils';
import { calculateAttendancePay, computePayroll } from '../lib/payroll';
import { PageHeader } from '../components/PageHeader';
import { Modal, FormField } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { TableToolbar } from '../components/TableToolbar';
import { DataState } from '../components/DataState';
import { KpiCard } from '../components/KpiCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PaginationBar } from '../components/PaginationBar';
import { QuickAttendanceCard, type QuickAttendanceState } from '../components/mobile/QuickAttendanceCard';
import { MobileCardList } from '../components/mobile/MobileCardList';
import { useAsyncList } from '../hooks/useAsyncData';
import { useCrudForm } from '../hooks/useCrudForm';
import { useTableControls } from '../hooks/useTableControls';
import { useToast } from '../contexts/toast';
import { employeesService, attendanceService } from '../services/employeesService';
import type { Employee, Attendance, EmployeeRole, PaymentStatus } from '../types';
import { monthRange, shiftISODate, today } from '../lib/date';

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

type EmployeeTab = 'employees' | 'attendance' | 'payroll';

export const NhanVienPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab: EmployeeTab =
    requestedTab === 'attendance' || requestedTab === 'payroll' ? requestedTab : 'employees';
  const [activeTab, setActiveTab] = useState<EmployeeTab>(initialTab);
  const { toast } = useToast();
  const [savingEmp, setSavingEmp] = useState(false);
  const [savingAtt, setSavingAtt] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => today().slice(0, 7));
  const [historyMonth, setHistoryMonth] = useState(() => today().slice(0, 7));
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    id: string;
    type: 'employee' | 'attendance' | 'payroll';
    name?: string;
  }>({ isOpen: false, id: '', type: 'employee' });

  const {
    data: employees,
    loading: empLoading,
    error: empError,
    refetch: refetchEmp,
  } = useAsyncList(employeesService.getAll, []);
  const {
    data: attendanceList,
    refetch: refetchAtt,
  } = useAsyncList(attendanceService.getAttendance, []);
  const {
    data: historyAttendance,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useAsyncList(
    () => attendanceService.getAttendance({ ...monthRange(historyMonth), limit: 5000 }),
    [historyMonth],
  );
  const {
    data: payrollAttendance,
    loading: payrollLoading,
    error: payrollError,
    refetch: refetchPayroll,
  } = useAsyncList(
    () => attendanceService.getAttendance({ ...monthRange(payrollMonth), limit: 5000 }),
    [payrollMonth],
  );

  const { searchQuery, setSearchQuery, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage } =
    useTableControls();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const nextTab: EmployeeTab = tab === 'attendance' || tab === 'payroll' ? tab : 'employees';
    if (nextTab !== activeTab) setActiveTab(nextTab);
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: EmployeeTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'employees') next.delete('tab');
    else next.set('tab', tab);
    setCurrentPage(1);
    setSearchParams(next);
  };

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
      address: '',
      join_date: today(),
      status: 'active',
    },
  });

  // Advance Pay Modal State
  const [payrollDetailKey, setPayrollDetailKey] = useState<string | null>(null);

    const [advPayModal, setAdvPayModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    amount: number;
    date: string;
    notes: string;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    amount: 0,
    date: today(),
    notes: '',
  });
  const [savingAdvPay, setSavingAdvPay] = useState(false);

  const openAdvPayModal = (employeeId?: string, employeeName?: string) => {
    const directMatch = employees.find((e) => e.id === employeeId);
    const nameMatches = employeeName ? employees.filter((e) => e.name === employeeName) : [];
    const emp = directMatch || (nameMatches.length === 1 ? nameMatches[0] : undefined);
    setAdvPayModal({
      isOpen: true,
      employeeId: emp ? emp.id : '',
      employeeName: emp?.name || employeeName || '',
      amount: 0,
      date: today(),
      notes: '',
    });
  };

  const handleSaveAdvancePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advPayModal.employeeId) {
      toast.warning('Vui lòng chọn nhân viên ứng lương');
      return;
    }
    const amount = Number(advPayModal.amount) || 0;
    if (amount <= 0) {
      toast.warning('Số tiền tạm ứng phải lớn hơn 0');
      return;
    }
    setSavingAdvPay(true);
    try {
      const emp = employees.find((x) => x.id === advPayModal.employeeId);
      const empName = emp ? emp.name : advPayModal.employeeName || 'Công nhân';
      const dailyPay = emp ? emp.daily_salary : 350000;

      await attendanceService.createAttendance({
        date: advPayModal.date || today(),
        employee_id: advPayModal.employeeId,
        employee_name: empName,
        work_shift: 0,
        daily_pay: dailyPay,
        advance_pay: amount,
        payment_status: 'unpaid',
        notes: advPayModal.notes || `Ứng lương tháng ${payrollMonth}`,
      });
      toast.success(`Đã ghi nhận ứng lương ${formatTien(amount)} cho ${empName}`);
      setAdvPayModal({ isOpen: false, employeeId: '', employeeName: '', amount: 0, date: today(), notes: '' });
      refetchAtt();
      if ((advPayModal.date || today()).startsWith(historyMonth)) refetchHistory();
      if ((advPayModal.date || today()).startsWith(payrollMonth)) refetchPayroll();
    } catch (err) {
      toast.error('Lỗi khi ghi nhận ứng lương');
      console.error(err);
    } finally {
      setSavingAdvPay(false);
    }
  };

  // Attendance Form State
  const {
    formState: attForm,
    openModal: openAttModal,
    closeModal: closeAttModal,
    handleChange: handleAttChange,
  } = useCrudForm<Attendance>({
    initialData: {
      date: today(),
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
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        Boolean(e.phone?.includes(q)) ||
        Boolean(e.address?.toLowerCase().includes(q)) ||
        roleLabels[e.role].label.toLowerCase().includes(q),
    );
  }, [employees, searchQuery]);

  const filteredAttendance = useMemo(() => {
    if (!searchQuery) return historyAttendance;
    const q = searchQuery.toLowerCase();
    return historyAttendance.filter(
      (a) =>
        a.employee_name.toLowerCase().includes(q) ||
        a.date.includes(q) ||
        Boolean(a.notes?.toLowerCase().includes(q)),
    );
  }, [historyAttendance, searchQuery]);

  // Attendance Statistics
  const attStats = useMemo(() => {
    const currentMonth = today().slice(0, 7);
    const rows = attendanceList.filter((a) => a.date.startsWith(currentMonth));
    const summary = computePayroll(rows, currentMonth);
    return {
      totalShifts: summary.totals.shifts,
      overtimeHours: summary.totals.overtime_hours,
      totalPayroll: summary.totals.net,
      totalUnpaid: summary.totals.unpaid,
    };
  }, [attendanceList]);

  // Quick Attendance State & View Mode
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [quickStates, setQuickStates] = useState<Record<string, QuickAttendanceState>>({});
  const [attViewMode, setAttViewMode] = useState<'quick' | 'history'>('quick');

  React.useEffect(() => {
    const activeEmps = employees.filter((e) => e.status === 'active');
    const existingForDate = attendanceList.filter((a) => a.date === selectedDate);
    const map: Record<string, QuickAttendanceState> = {};

    activeEmps.forEach((emp) => {
      const existing = existingForDate.find((a) => a.employee_id === emp.id || a.employee_name === emp.name);
      map[emp.id] = {
        employee_id: emp.id,
        attendance_id: existing?.id,
        work_shift: existing ? Number(existing.work_shift) : 1,
        overtime_hours: existing ? Number(existing.overtime_hours) : 0,
        daily_pay: existing ? Number(existing.daily_pay) : emp.daily_salary || 350000,
        advance_pay: existing ? Number(existing.advance_pay) : 0,
        notes: existing?.notes || '',
      };
    });

    setQuickStates(map);
  }, [selectedDate, employees, attendanceList]);

  const handlePrevDate = () => {
    setSelectedDate(shiftISODate(selectedDate, -1));
  };

  const handleNextDate = () => {
    setSelectedDate(shiftISODate(selectedDate, 1));
  };

  const handleMarkAllFull = () => {
    setQuickStates((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], work_shift: 1 };
      });
      return updated;
    });
    toast.success('Đã chọn 1 Công cho tất cả công nhân');
  };

  const handleSaveQuickAttendance = async () => {
    if (savingAtt) return;
    setSavingAtt(true);
    try {
      const records = Object.values(quickStates);
      await attendanceService.batchUpsertAttendance(selectedDate, records);
      toast.success(`Đã lưu bảng chấm công ngày ${formatNgay(selectedDate)}`);
      refetchAtt();
      if (selectedDate.startsWith(historyMonth)) refetchHistory();
      if (selectedDate.startsWith(payrollMonth)) refetchPayroll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu bảng chấm công');
      console.error('Lỗi khi lưu bảng chấm công:', err);
    } finally {
      setSavingAtt(false);
    }
  };

  const payroll = useMemo(
    () => computePayroll(payrollAttendance, payrollMonth),
    [payrollAttendance, payrollMonth],
  );

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
    if (data.name.trim().length < 2) {
      toast.warning('Tên nhân viên phải có ít nhất 2 ký tự');
      return;
    }
    if (!Number.isFinite(Number(data.daily_salary)) || Number(data.daily_salary) <= 0) {
      toast.warning('Đơn giá lương công phải lớn hơn 0');
      return;
    }
    if (data.phone && !/^[0-9+().\s-]{8,20}$/.test(data.phone.trim())) {
      toast.warning('Số điện thoại không đúng định dạng');
      return;
    }
    if (data.join_date && data.join_date > today()) {
      toast.warning('Ngày vào làm không được ở tương lai');
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

  const confirmDeactivateEmployee = async () => {
    try {
      await employeesService.deactivate(confirmState.id);
      toast.success('Đã chuyển nhân viên sang trạng thái đã nghỉ');
      refetchEmp();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không cập nhật được trạng thái nhân viên');
      console.error('Lỗi khi cho nhân viên nghỉ:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'employee' });
  };

  // Handle Attendance Save
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn bấm Lưu nhiều lần — tránh chấm công trùng cho cùng một người.
    if (savingAtt) return;

    const data = attForm.data;
    if (!data.employee_id) {
      toast.warning('Vui lòng chọn nhân viên chấm công');
      return;
    }
    if (!data.date) {
      toast.warning('Vui lòng chọn ngày chấm công');
      return;
    }
    const workShift = Number(data.work_shift);
    const overtimeHours = Number(data.overtime_hours) || 0;
    const dailyPayInput = Number(data.daily_pay);
    if (!Number.isFinite(workShift) || workShift < 0 || workShift > 3) {
      toast.warning('Số công phải từ 0 đến 3');
      return;
    }
    if (!Number.isFinite(overtimeHours) || overtimeHours < 0 || overtimeHours > 24) {
      toast.warning('Giờ tăng ca phải từ 0 đến 24 giờ');
      return;
    }
    if (!Number.isFinite(dailyPayInput) || dailyPayInput <= 0) {
      toast.warning('Mức lương ngày phải lớn hơn 0');
      return;
    }

    setSavingAtt(true);
    try {
      const emp = employees.find((x) => x.id === data.employee_id);
      const empName = emp ? emp.name : data.employee_name || 'Công nhân';
      const dailyPay = dailyPayInput || emp?.daily_salary || 350000;

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
      refetchHistory();
      refetchPayroll();
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
      refetchHistory();
      refetchPayroll();
    } catch (err) {
      toast.error('Lỗi khi xóa lượt chấm công');
      console.error('Lỗi khi xóa lượt chấm công:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'attendance' });
  };

  const requestPayrollSettlement = (employeeId: string | undefined, name: string) => {
    if (!employeeId) {
      toast.warning('Dữ liệu cũ chưa gắn hồ sơ nhân viên nên chưa thể chốt lương tự động');
      return;
    }
    setConfirmState({ isOpen: true, id: employeeId, name, type: 'payroll' });
  };

  const confirmPayrollSettlement = async () => {
    try {
      await attendanceService.payMonthForEmployee(confirmState.id, payrollMonth);
      toast.success(`Đã chốt thanh toán lương tháng ${payrollMonth} cho ${confirmState.name || 'nhân viên'}`);
      await Promise.all([refetchAtt(), refetchHistory(), refetchPayroll()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không chốt được thanh toán lương');
      console.error('Lỗi khi chốt lương:', err);
    }
    setConfirmState({ isOpen: false, id: '', type: 'payroll' });
  };

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title="Quản Lý Nhân Sự"
        subtitle="Quản lý hồ sơ công nhân xưởng phế, chấm công hàng ngày và tính lương công"
        action={
          activeTab === 'payroll'
            ? undefined
            : {
                label: activeTab === 'employees' ? 'Thêm nhân viên' : 'Chấm công mới',
                icon: Plus,
                onClick: () => (activeTab === 'employees' ? openEmpModal() : openAttModal()),
              }
        }
      />

      {/* KPI Cards for Payroll */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
          subtitle={`${attStats.overtimeHours} giờ tăng ca tháng này`}
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

      {/* CIC-IBST Pill Tabs (Trên mobile: Thu gọn thành Icon + Con số đếm vừa vặn 100% màn hình) */}
      <div role="tablist" aria-label="Quản lý nhân sự" className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-xl shadow-xs border border-[var(--border-color)] bg-[var(--bg-surface)] w-full sm:w-fit">
        <button
          role="tab"
          aria-selected={activeTab === 'employees'}
          onClick={() => handleTabChange('employees')}
          title={`Danh sách nhân viên (${employees.length})`}
          className={cn(
            'tap-target sm:min-h-0 sm:min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'employees'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <Users
            size={16}
            className={activeTab === 'employees' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span className="hidden sm:inline">Danh sách nhân viên</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-black/10 dark:bg-white/20 rounded-full font-mono">
            {employees.length}
          </span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'attendance'}
          onClick={() => handleTabChange('attendance')}
          title={`Chấm công (${attendanceList.length})`}
          className={cn(
            'tap-target sm:min-h-0 sm:min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'attendance'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <Calendar
            size={16}
            className={activeTab === 'attendance' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span className="hidden sm:inline">Chấm công</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-black/10 dark:bg-white/20 rounded-full font-mono">
            {attendanceList.length}
          </span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'payroll'}
          onClick={() => handleTabChange('payroll')}
          title="Bảng lương tháng"
          className={cn(
            'tap-target sm:min-h-0 sm:min-w-0 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'payroll'
              ? 'bg-[var(--primary-500)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
          )}
        >
          <DollarSign
            size={16}
            className={activeTab === 'payroll' ? 'text-white' : 'text-[var(--text-muted)]'}
          />
          <span className="hidden sm:inline">Bảng lương tháng</span>
        </button>
      </div>

      {/* Table Toolbar */}
      {(activeTab === 'employees' || (activeTab === 'attendance' && attViewMode === 'history')) && (
        <TableToolbar
          placeholder={
            activeTab === 'employees' ? 'Tìm theo tên hoặc SĐT...' : 'Tìm theo tên công nhân hoặc ngày...'
          }
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={activeTab === 'employees' ? filteredEmployees.length : filteredAttendance.length}
        />
      )}

      {/* TAB 1: DANH SÁCH NHÂN VIÊN */}
      {activeTab === 'employees' && (
        <DataState loading={empLoading} error={empError} isEmpty={filteredEmployees.length === 0}>
          <div className="card hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
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
                      Ngày vào làm
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
                        <tr
                          key={emp.id}
                          onClick={() => openEmpModal(emp)}
                          className="tr-hover cursor-pointer"
                        >
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
                          <td className="td-cell font-mono text-xs text-[var(--text-secondary)]">
                            {emp.join_date ? formatNgay(emp.join_date) : '—'}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEmpModal(emp);
                                }}
                                className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                                title="Sửa"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEmployee(emp.id);
                                }}
                                className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-rose-600 cursor-pointer"
                                title="Cho nghỉ việc"
                                disabled={emp.status === 'inactive'}
                              >
                                <UserMinus size={16} />
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
          <MobileCardList
            items={filteredEmployees
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((emp) => {
                const roleInfo = roleLabels[emp.role] || roleLabels.staff;
                return {
                  id: emp.id,
                  title: emp.name,
                  subtitle: emp.phone || 'Chưa có số điện thoại',
                  badge: <StatusBadge status={emp.status} />,
                  accentColor: emp.status === 'active' ? '#10b981' : '#94a3b8',
                  onClick: () => openEmpModal(emp),
                  fields: [
                    { label: 'Chức vụ', value: roleInfo.label },
                    { label: 'Lương công', value: <span className="font-mono">{formatTien(emp.daily_salary)}/ngày</span> },
                    { label: 'Ngày vào làm', value: emp.join_date ? formatNgay(emp.join_date) : '—' },
                    { label: 'Địa chỉ', value: emp.address || '—' },
                    { label: 'Ghi chú', value: emp.notes || '—' },
                  ],
                  actions: (
                    <>
                      <button
                        type="button"
                        onClick={() => openEmpModal(emp)}
                        className="tap-target flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)]"
                        aria-label={`Sửa ${emp.name}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="tap-target flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
                        aria-label={`Cho ${emp.name} nghỉ việc`}
                        disabled={emp.status === 'inactive'}
                      >
                        <UserMinus size={18} />
                      </button>
                    </>
                  ),
                };
              })}
            emptyMessage="Chưa có hồ sơ nhân viên"
          />
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
        <div className="space-y-4">
          {/* Control Bar: Selector & View Toggle */}
          <div className="card flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {attViewMode === 'quick' ? (
                <>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevDate}
                      className="btn-secondary px-2.5 py-1.5 text-xs flex items-center justify-center cursor-pointer"
                      title="Ngày trước"
                      aria-label="Chuyển sang ngày trước"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <input
                      aria-label="Ngày chấm công nhanh"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="input-field py-1 px-2.5 font-mono font-bold text-xs w-auto cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={handleNextDate}
                      className="btn-secondary px-2.5 py-1.5 text-xs flex items-center justify-center cursor-pointer"
                      title="Ngày sau"
                      aria-label="Chuyển sang ngày sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(today())}
                    className="btn-secondary px-3 py-1.5 text-xs font-extrabold cursor-pointer"
                  >
                    Hôm nay
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--primary-500)]" />
                  <label htmlFor="attendance-history-month" className="text-xs font-bold text-[var(--text-secondary)]">
                    Tháng lịch sử
                  </label>
                  <input
                    id="attendance-history-month"
                    type="month"
                    value={historyMonth}
                    onChange={(event) => {
                      if (event.target.value) {
                        setHistoryMonth(event.target.value);
                        setCurrentPage(1);
                      }
                    }}
                    className="input-field w-auto font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {attViewMode === 'quick' && (
                <button
                  type="button"
                  onClick={handleMarkAllFull}
                  className="tap-target bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-emerald-500 cursor-pointer active:scale-95 transition-all"
                >
                  <Zap size={14} className="fill-white" /> ⚡ Chấm đủ tất cả (1 Công)
                </button>
              )}

              <div className="flex items-center p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setAttViewMode('quick')}
                  aria-pressed={attViewMode === 'quick'}
                  className={cn(
                    'tap-target px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                    attViewMode === 'quick'
                      ? 'bg-[var(--primary-500)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  <Zap size={13} /> 1-Chạm
                </button>
                <button
                  type="button"
                  onClick={() => setAttViewMode('history')}
                  aria-pressed={attViewMode === 'history'}
                  className={cn(
                    'tap-target px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                    attViewMode === 'history'
                      ? 'bg-[var(--primary-500)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  <List size={13} /> Lịch sử
                </button>
              </div>
            </div>
          </div>

          {/* MODE A: BẢNG CHẤM CÔNG NHANH 1-CHẠM */}
          {attViewMode === 'quick' && (
            <DataState loading={empLoading} error={empError} isEmpty={employees.filter((e) => e.status === 'active').length === 0}>
              <div className="space-y-3 pb-36 lg:pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {employees
                    .filter((e) => e.status === 'active')
                    .map((emp) => {
                      const state = quickStates[emp.id] || {
                        employee_id: emp.id,
                        work_shift: 1,
                        overtime_hours: 0,
                        daily_pay: emp.daily_salary || 350000,
                        advance_pay: 0,
                        notes: '',
                      };
                      return (
                        <QuickAttendanceCard
                          key={emp.id}
                          employee={emp}
                          state={state}
                          onChange={(newState) => {
                            setQuickStates((prev) => ({
                              ...prev,
                              [emp.id]: newState,
                            }));
                          }}
                        />
                      );
                    })}
                </div>

                {/* Mobile Sticky Bottom Floating Save Bar */}
                <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 lg:bottom-6 lg:left-72 lg:right-8 z-40 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={handleSaveQuickAttendance}
                    disabled={savingAtt}
                    className="btn-primary py-3.5 px-6 rounded-2xl text-sm font-extrabold shadow-2xl flex items-center justify-center gap-2.5 border-2 border-white/20 w-full max-w-lg cursor-pointer pointer-events-auto active:scale-95 disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    <span>
                      {savingAtt
                        ? 'Đang lưu...'
                        : `Lưu Bảng Chấm Công Ngày ${formatNgay(selectedDate)} (${Object.values(quickStates).filter((x) => x.work_shift > 0).length}/${employees.filter((e) => e.status === 'active').length} làm)`}
                    </span>
                  </button>
                </div>
              </div>
            </DataState>
          )}

          {/* MODE B: LỊCH SỬ DẠNG BẢNG */}
          {attViewMode === 'history' && (
            <DataState loading={historyLoading} error={historyError} isEmpty={filteredAttendance.length === 0}>
              <div className="card hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
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
                          <tr
                            key={att.id}
                            onClick={() => openAttModal(att)}
                            className="tr-hover cursor-pointer"
                          >
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
                              {formatTien(Math.max(0, calculateAttendancePay(att).net))}
                            </td>
                            <td className="td-cell">
                              <div className="space-y-1">
                                <StatusBadge status={att.payment_status} />
                                {att.paid_at && (
                                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                    Chốt {formatNgay(att.paid_at)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="td-cell text-xs text-[var(--text-muted)] max-w-xs truncate">
                              {att.notes || '—'}
                            </td>
                            <td className="td-cell text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAttModal(att);
                                  }}
                                  className="icon-action text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                                  title="Sửa"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAttendance(att.id);
                                  }}
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
              <MobileCardList
                items={filteredAttendance
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((att) => ({
                    id: att.id,
                    title: att.employee_name,
                    subtitle: formatNgay(att.date),
                    badge: <StatusBadge status={att.payment_status} />,
                    accentColor: att.payment_status === 'paid' ? '#10b981' : '#f59e0b',
                    onClick: () => openAttModal(att),
                    fields: [
                      { label: 'Số công', value: `${att.work_shift} công` },
                      { label: 'Tăng ca', value: att.overtime_hours ? `${att.overtime_hours} giờ` : '—' },
                      { label: 'Thực lĩnh', value: <span className="font-mono text-emerald-600">{formatTien(Math.max(0, calculateAttendancePay(att).net))}</span> },
                      { label: 'Tạm ứng', value: att.advance_pay ? formatTien(att.advance_pay) : '0 đ' },
                      { label: 'Ngày chốt', value: att.paid_at ? formatNgay(att.paid_at) : 'Chưa chốt' },
                      { label: 'Ghi chú', value: att.notes || '—' },
                    ],
                    actions: (
                      <>
                        <button
                          type="button"
                          onClick={() => openAttModal(att)}
                          className="tap-target flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)]"
                          aria-label={`Sửa chấm công ${att.employee_name}`}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttendance(att.id)}
                          className="tap-target flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
                          aria-label={`Xóa chấm công ${att.employee_name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    ),
                  }))}
                emptyMessage="Chưa có lịch sử chấm công"
              />
              <PaginationBar
                currentPage={currentPage}
                totalItems={filteredAttendance.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </DataState>
          )}
        </div>
      )}

      {/* TAB 3: BẢNG LƯƠNG THÁNG */}
      {activeTab === 'payroll' && (
        <DataState loading={payrollLoading} error={payrollError} isEmpty={false}>
          <div className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--primary-500)]" />
                  <label htmlFor="payroll-month" className="text-xs font-bold text-[var(--text-secondary)]">
                    Kỳ lương tháng
                  </label>
                  <input
                    id="payroll-month"
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => {
                      if (e.target.value) setPayrollMonth(e.target.value);
                    }}
                    className="input-field w-auto"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openAdvPayModal()}
                  className="px-3 py-1.5 rounded-xl text-xs font-black text-amber-900 bg-amber-400 hover:bg-amber-500 dark:text-amber-100 dark:bg-amber-700/80 hover:dark:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <DollarSign size={14} />
                  + Ứng Lương
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="text-[var(--text-muted)]">
                  Tổng công: <b className="font-mono text-[var(--text-primary)]">{payroll.totals.shifts}</b>
                </span>
                <span className="text-[var(--text-muted)]">
                  Tổng gộp: <b className="font-mono text-[var(--text-primary)]">{formatTien(payroll.totals.gross)}</b>
                </span>
                <span className="text-[var(--text-muted)]">
                  Đã ứng: <b className="font-mono text-amber-600">-{formatTien(payroll.totals.advance)}</b>
                </span>
                <span className="text-[var(--text-muted)]">
                  Thực lĩnh còn nợ: <b className="font-mono text-rose-600">{formatTien(payroll.totals.unpaid)}</b>
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
              <>
              <div className="erp-table-container hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Bảng lương tháng {payrollMonth}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="th-cell">
                          Nhân viên
                        </th>
                        <th className="th-cell text-right">Số công</th>
                        <th className="th-cell text-right">Tăng ca</th>
                        <th className="th-cell text-right">Lương gộp</th>
                        <th className="th-cell text-right">Đã tạm ứng</th>
                        <th className="th-cell text-right font-extrabold text-[var(--primary-600)]">
                          <div>Thực lĩnh còn nợ</div>
                          <div className="text-[10px] font-normal text-[var(--text-muted)]">(Gộp − Ứng)</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.rows.map((r) => (
                        <tr key={r.key} onClick={() => setPayrollDetailKey(r.key)} className="tr-hover cursor-pointer" title="Bấm để xem chi tiết chấm công & lương">
                          <td className="td-cell text-xs font-bold text-[var(--text-primary)]">{r.name}</td>
                          <td className="td-cell text-right font-mono text-xs">{r.shifts}</td>
                          <td className="td-cell text-right font-mono text-xs">
                            {r.overtime_hours > 0 ? `${r.overtime_hours} giờ` : '—'}
                          </td>
                          <td className="td-cell text-right font-mono text-xs text-[var(--text-secondary)]">
                            {formatTien(r.gross)}
                          </td>
                          <td className="td-cell text-right font-mono text-xs">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-amber-600">
                                {r.advance > 0 ? `-${formatTien(r.advance)}` : '0 đ'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAdvPayModal(r.employee_id, r.name);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800/60 rounded hover:bg-amber-400 cursor-pointer"
                                title={`Ghi nhận ứng lương cho ${r.name}`}
                              >
                                + Ứng
                              </button>
                            </div>
                          </td>
                          <td className="td-cell text-right font-mono text-xs font-black">
                            {r.net < 0 ? (
                              <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800/40 font-bold" title="Nhân viên đã ứng trước nhiều hơn tiền công tháng này">
                                ⚠️ NV Nợ Xưởng {formatTien(Math.abs(r.net))}
                              </span>
                            ) : r.unpaid > 0 ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800/40">
                                  {formatTien(r.unpaid)}
                                </span>
                                {r.employee_id && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      requestPayrollSettlement(r.employee_id, r.name);
                                    }}
                                    className="tap-target px-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                                  >
                                    Chốt trả
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 font-bold">
                                🟢 Đã trả đủ (0 đ)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--bg-subtle)] font-bold">
                        <td className="td-cell text-xs uppercase">Tổng cộng</td>
                        <td className="td-cell text-right font-mono text-xs">{payroll.totals.shifts}</td>
                        <td className="td-cell text-right font-mono text-xs">{payroll.totals.overtime_hours} giờ</td>
                        <td className="td-cell text-right font-mono text-xs">
                          {formatTien(payroll.totals.gross)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-amber-600">
                          -{formatTien(payroll.totals.advance)}
                        </td>
                        <td className="td-cell text-right font-mono text-xs text-rose-600 font-black">
                          {formatTien(payroll.totals.unpaid)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <MobileCardList
                items={payroll.rows.map((row) => ({
                  id: row.key,
                  title: row.name,
                  subtitle: `${row.shifts} công trong tháng • Bấm xem chi tiết`,
                  onClick: () => setPayrollDetailKey(row.key),
                  badge: (
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-xs font-bold',
                        row.net < 0
                          ? 'bg-amber-100 text-amber-800'
                          : row.unpaid > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {row.net < 0 ? 'Nợ xưởng' : row.unpaid > 0 ? 'Chưa trả đủ' : 'Đã trả đủ'}
                    </span>
                  ),
                  accentColor: row.net < 0 ? '#f59e0b' : row.unpaid > 0 ? '#f43f5e' : '#10b981',
                  fields: [
                    { label: 'Lương gộp', value: <span className="font-mono">{formatTien(row.gross)}</span> },
                    { label: 'Tăng ca', value: `${row.overtime_hours} giờ • ${formatTien(row.overtime)}` },
                    {
                      label: 'Đã tạm ứng',
                      value: (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-600 font-bold">{formatTien(row.advance)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdvPayModal(row.employee_id, row.name);
                            }}
                            className="px-2 py-0.5 text-[11px] font-black text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800/80 rounded-lg border border-amber-400 hover:bg-amber-400 cursor-pointer shadow-xs"
                          >
                            + Ứng lương
                          </button>
                        </div>
                      ),
                    },
                    {
                      label: row.net < 0 ? 'NV nợ xưởng' : 'Thực lĩnh còn nợ',
                      value: (
                        <span className={cn('font-mono font-bold', row.net < 0 ? 'text-amber-700' : 'text-rose-600')}>
                          {formatTien(row.net < 0 ? Math.abs(row.net) : row.unpaid)}
                        </span>
                      ),
                    },
                  ],
                  actions: row.unpaid > 0 && row.employee_id ? (
                    <button
                      type="button"
                      onClick={() => requestPayrollSettlement(row.employee_id, row.name)}
                      className="tap-target px-3 rounded-xl bg-emerald-600 text-white text-xs font-extrabold"
                    >
                      Chốt đã trả
                    </button>
                  ) : undefined,
                }))}
                emptyMessage="Chưa có dữ liệu lương trong tháng"
              />
              </>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ngày vào làm">
              <input
                type="date"
                max={today()}
                className="input-field font-mono"
                value={empForm.data?.join_date || ''}
                onChange={(e) => handleEmpChange('join_date', e.target.value)}
              />
            </FormField>

            <FormField label="Địa chỉ">
              <input
                type="text"
                className="input-field"
                placeholder="Địa chỉ liên hệ"
                value={empForm.data?.address || ''}
                onChange={(e) => handleEmpChange('address', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {employees
                .filter((emp) => emp.status === 'active' || emp.id === attForm.data?.employee_id)
                .map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {roleLabels[emp.role]?.label || emp.role} ({formatTien(emp.daily_salary)}/ngày)
                </option>
                ))}
            </select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Số ngày công" required>
              <select
                className="input-field font-mono font-bold"
                value={attForm.data?.work_shift ?? 1}
                onChange={(e) => handleAttChange('work_shift', Number(e.target.value))}
              >
                <option value={1}>1.0 công (Cả ngày)</option>
                <option value={0.5}>0.5 công (Nửa ngày)</option>
                <option value={1.5}>1.5 công (Tăng ca)</option>
                <option value={2}>2.0 công (2 ca)</option>
                {attForm.data?.id && <option value={0}>0 công (chỉ tạm ứng)</option>}
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

          <FormField label="Giờ tăng ca (tính 150% đơn giá giờ)">
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="24"
                step="0.5"
                className="input-field pl-10 font-mono"
                value={attForm.data?.overtime_hours || ''}
                onChange={(e) => handleAttChange('overtime_hours', Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </FormField>

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

          {/* Computed Pay Preview */}
          {(() => {
            const preview = calculateAttendancePay(attForm.data || {});
            return (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2 text-xs">
                <div className="flex justify-between gap-3 text-[var(--text-muted)]">
                  <span>Lương công</span>
                  <span className="font-mono">{formatTien(preview.regular)}</span>
                </div>
                <div className="flex justify-between gap-3 text-[var(--text-muted)]">
                  <span>Tăng ca 150%</span>
                  <span className="font-mono">+{formatTien(preview.overtime)}</span>
                </div>
                <div className="flex justify-between gap-3 text-rose-600">
                  <span>Tạm ứng</span>
                  <span className="font-mono">-{formatTien(preview.advance)}</span>
                </div>
                <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                  <span className="text-[var(--text-secondary)] font-extrabold">THỰC LĨNH</span>
                  <span className={cn('font-mono font-black text-base', preview.net < 0 ? 'text-amber-700' : 'text-emerald-600')}>
                    {formatTien(Math.abs(preview.net))}{preview.net < 0 ? ' (NV nợ xưởng)' : ''}
                  </span>
                </div>
              </div>
            );
          })()}

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

          <div className="flex justify-between items-center pt-4 border-t border-[var(--border-color)]">
            {attForm.data?.id ? (
              <button
                type="button"
                onClick={() => {
                  const idToDelete = attForm.data!.id!;
                  closeAttModal();
                  handleDeleteAttendance(idToDelete);
                }}
                className="py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={16} />
                Xóa lượt này
              </button>
            ) : (
              <div />
            )}
            <div className="flex space-x-3">
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
          </div>
        </form>
      </Modal>

      
      
      {/* MODAL CHI TIẾT LƯƠNG NHÂN VIÊN */}
      <Modal
        isOpen={Boolean(payrollDetailKey)}
        onClose={() => setPayrollDetailKey(null)}
        title={`Chi tiết lương tháng ${payrollMonth}`}
      >
        <div className="space-y-4">
          {(() => {
            const detailRow = payroll.rows.find((r) => r.key === payrollDetailKey);
            const detailAtt = detailRow
              ? payrollAttendance.filter((att: Attendance) =>
                  detailRow.employee_id
                    ? att.employee_id === detailRow.employee_id
                    : att.employee_name.trim().toLocaleLowerCase('vi') === detailRow.name.trim().toLocaleLowerCase('vi'),
                )
              : [];

            if (!detailRow) return null;

            return (
              <>
                <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block">Tổng công</span>
                    <b className="font-mono text-sm text-[var(--text-primary)]">{detailRow.shifts} công</b>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Tăng ca</span>
                    <b className="font-mono text-sm text-purple-600">{detailRow.overtime_hours} giờ</b>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Lương gộp</span>
                    <b className="font-mono text-sm text-[var(--text-primary)]">{formatTien(detailRow.gross)}</b>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Đã tạm ứng</span>
                    <b className="font-mono text-sm text-amber-600">-{formatTien(detailRow.advance)}</b>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Thực lĩnh còn nợ</span>
                    <b className="font-mono text-sm text-rose-600">{formatTien(detailRow.unpaid)}</b>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
                    Nhật ký chấm công & ứng tiền ({detailAtt.length} lượt)
                  </h4>
                  <div className="flex items-center gap-2">
                    {detailRow.unpaid > 0 && detailRow.employee_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayrollDetailKey(null);
                          requestPayrollSettlement(detailRow.employee_id, detailRow.name);
                        }}
                        className="tap-target px-2.5 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                      >
                        Chốt đã trả
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPayrollDetailKey(null);
                        openAdvPayModal(detailRow.employee_id, detailRow.name);
                      }}
                      className="tap-target px-2.5 text-xs font-black text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800 rounded-lg hover:bg-amber-400 cursor-pointer flex items-center gap-1"
                    >
                      <DollarSign size={13} />
                      + Ứng lương
                    </button>
                  </div>
                </div>

                {detailAtt.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    Chưa có nhật ký chấm công chi tiết trong tháng này.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {detailAtt.map((att: Attendance) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold font-mono text-[var(--text-primary)]">
                            {formatNgay(att.date)}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {att.work_shift > 0 ? `${att.work_shift} công (${formatTien(att.daily_pay)}/ngày)` : 'Chỉ tạm ứng tiền'}
                            {att.notes ? ` • ${att.notes}` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono">
                            {(att.advance_pay || 0) > 0 && (
                              <span className="block text-amber-600 font-bold text-[11px]">
                                Ứng -{formatTien(att.advance_pay || 0)}
                              </span>
                            )}
                            <span className="block font-black text-emerald-600">
                              {formatTien(Math.max(0, calculateAttendancePay(att).net))}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPayrollDetailKey(null);
                                openAttModal(att);
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer"
                              title="Sửa"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPayrollDetailKey(null);
                                handleDeleteAttendance(att.id);
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Modal>

      {/* MODAL ỨNG LƯƠNG NHÂN VIÊN */}
      <Modal
        isOpen={advPayModal.isOpen}
        onClose={() => setAdvPayModal({ ...advPayModal, isOpen: false })}
        title="Phiếu ứng lương nhân viên"
      >
        <form onSubmit={handleSaveAdvancePay} className="space-y-4">
          <FormField label="Chọn nhân viên ứng lương" required>
            <select
              className="input-field font-bold"
              value={advPayModal.employeeId || ''}
              onChange={(e) => {
                const empId = e.target.value;
                const emp = employees.find((x) => x.id === empId);
                setAdvPayModal({
                  ...advPayModal,
                  employeeId: empId,
                  employeeName: emp ? emp.name : '',
                });
              }}
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.filter((emp) => emp.status === 'active').map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({formatTien(emp.daily_salary)}/ngày)
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Ngày ứng lương" required>
            <input
              type="date"
              required
              className="input-field font-mono"
              value={advPayModal.date}
              onChange={(e) => setAdvPayModal({ ...advPayModal, date: e.target.value })}
            />
          </FormField>

          <FormField label="Số tiền tạm ứng (đ)" required>
            <input
              type="number"
              inputMode="numeric"
              required
              min="10000"
              step="10000"
              className="input-field font-mono font-black text-lg text-rose-600"
              placeholder="Ví dụ: 500000"
              value={advPayModal.amount || ''}
              onChange={(e) => setAdvPayModal({ ...advPayModal, amount: Number(e.target.value) || 0 })}
            />
          </FormField>

          <FormField label="Ghi chú ứng lương">
            <input
              type="text"
              className="input-field text-xs"
              placeholder="Ví dụ: Tạm ứng lương giữa tháng..."
              value={advPayModal.notes}
              onChange={(e) => setAdvPayModal({ ...advPayModal, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setAdvPayModal({ ...advPayModal, isOpen: false })}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingAdvPay}
              className="btn-primary bg-amber-500 hover:bg-amber-600 text-slate-950 font-black disabled:opacity-60"
            >
              {savingAdvPay ? 'Đang lưu...' : 'Xác nhận ứng lương'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, id: '', type: 'employee' })}
        onConfirm={
          confirmState.type === 'employee'
            ? confirmDeactivateEmployee
            : confirmState.type === 'payroll'
              ? confirmPayrollSettlement
              : confirmDeleteAttendance
        }
        title={
          confirmState.type === 'employee'
            ? 'Xác nhận nhân viên nghỉ việc'
            : confirmState.type === 'payroll'
              ? 'Chốt thanh toán lương'
              : 'Xóa lượt chấm công'
        }
        message={
          confirmState.type === 'employee'
            ? 'Nhân viên sẽ được chuyển sang trạng thái đã nghỉ và không còn xuất hiện trong bảng chấm công mới. Toàn bộ lịch sử công và lương vẫn được giữ lại.'
            : confirmState.type === 'payroll'
              ? `Xác nhận đã thanh toán đủ lương tháng ${payrollMonth} cho ${confirmState.name || 'nhân viên này'}? Sau khi chốt, các lượt trong kỳ sẽ chuyển sang Đã thanh toán.`
              : 'Bạn có chắc chắn muốn xóa lượt chấm công này? Hành động này không thể hoàn tác.'
        }
        variant={confirmState.type === 'attendance' ? 'danger' : 'warning'}
        confirmText={confirmState.type === 'employee' ? 'Cho nghỉ việc' : confirmState.type === 'payroll' ? 'Chốt đã trả' : 'Xóa'}
        cancelText="Hủy"
      />
    </div>
  );
};
