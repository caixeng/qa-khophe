import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users, Calendar, DollarSign, UserCheck } from 'lucide-react';
import { cn, formatTien, formatNgay } from '../../lib/utils';
import { computePayroll } from '../../lib/payroll';
import { PageHeader } from '../../components/PageHeader';
import { TableToolbar } from '../../components/TableToolbar';
import { KpiCard } from '../../components/KpiCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAsyncList } from '../../hooks/useAsyncData';
import { useCrudForm } from '../../hooks/useCrudForm';
import { useTableControls } from '../../hooks/useTableControls';
import { useToast } from '../../contexts/toast';
import { employeesService, attendanceService } from '../../services/employeesService';
import type { Employee, Attendance } from '../../types';
import { monthRange, shiftISODate, today } from '../../lib/date';
import type { QuickAttendanceState } from '../../components/mobile/QuickAttendanceCard';

import type { EmployeeTab } from './types';
import { roleLabels } from './types';
import { EmployeeListTab } from './tabs/EmployeeListTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { PayrollTab } from './tabs/PayrollTab';
import { EmployeeFormModal } from './modals/EmployeeFormModal';
import { AttendanceDetailModal } from './modals/AttendanceDetailModal';
import { PayrollDetailModal } from './modals/PayrollDetailModal';
import { AdvancePayModal } from './modals/AdvancePayModal';

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

  const payrollDetailRow = useMemo(() => {
    return payroll.rows.find((r: any) => r.key === payrollDetailKey);
  }, [payroll.rows, payrollDetailKey]);

  const payrollDetailAtt = useMemo(() => {
    if (!payrollDetailRow) return [];
    return payrollAttendance.filter((att: Attendance) =>
      payrollDetailRow.employee_id
        ? att.employee_id === payrollDetailRow.employee_id
        : att.employee_name.trim().toLocaleLowerCase('vi') === payrollDetailRow.name.trim().toLocaleLowerCase('vi'),
    );
  }, [payrollAttendance, payrollDetailRow]);

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

      {/* KPI Cards */}
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

      {/* Tabs */}
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
          <Users size={16} className={activeTab === 'employees' ? 'text-white' : 'text-[var(--text-muted)]'} />
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
          <Calendar size={16} className={activeTab === 'attendance' ? 'text-white' : 'text-[var(--text-muted)]'} />
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
          <DollarSign size={16} className={activeTab === 'payroll' ? 'text-white' : 'text-[var(--text-muted)]'} />
          <span className="hidden sm:inline">Bảng lương tháng</span>
        </button>
      </div>

      {/* Toolbar */}
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

      {/* TABS */}
      {activeTab === 'employees' && (
        <EmployeeListTab
          loading={empLoading}
          error={empError}
          employees={employees}
          filteredEmployees={filteredEmployees}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          onOpenEmpModal={openEmpModal}
          onDeleteEmployee={handleDeleteEmployee}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceTab
          attViewMode={attViewMode}
          setAttViewMode={setAttViewMode}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          historyMonth={historyMonth}
          setHistoryMonth={setHistoryMonth}
          quickStates={quickStates}
          setQuickStates={setQuickStates}
          employees={employees}
          empLoading={empLoading}
          empError={empError}
          historyAttendance={historyAttendance}
          filteredAttendance={filteredAttendance}
          historyLoading={historyLoading}
          historyError={historyError}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          savingAtt={savingAtt}
          setCurrentPage={setCurrentPage}
          setItemsPerPage={setItemsPerPage}
          handlePrevDate={handlePrevDate}
          handleNextDate={handleNextDate}
          handleMarkAllFull={handleMarkAllFull}
          handleSaveQuickAttendance={handleSaveQuickAttendance}
          onOpenAttModal={openAttModal}
          onDeleteAttendance={handleDeleteAttendance}
        />
      )}

      {activeTab === 'payroll' && (
        <PayrollTab
          payrollLoading={payrollLoading}
          payrollError={payrollError}
          payrollMonth={payrollMonth}
          setPayrollMonth={setPayrollMonth}
          payroll={payroll}
          onOpenAdvPayModal={openAdvPayModal}
          setPayrollDetailKey={setPayrollDetailKey}
          requestPayrollSettlement={requestPayrollSettlement}
        />
      )}

      {/* MODALS */}
      <EmployeeFormModal
        isOpen={empForm.isOpen}
        onClose={closeEmpModal}
        data={empForm.data}
        saving={savingEmp}
        onChange={handleEmpChange}
        onSubmit={handleSaveEmployee}
      />

      <AttendanceDetailModal
        isOpen={attForm.isOpen}
        onClose={closeAttModal}
        data={attForm.data}
        saving={savingAtt}
        employees={employees}
        onChange={handleAttChange}
        onSubmit={handleSaveAttendance}
        onDelete={handleDeleteAttendance}
      />

      <PayrollDetailModal
        isOpen={Boolean(payrollDetailKey)}
        onClose={() => setPayrollDetailKey(null)}
        payrollMonth={payrollMonth}
        detailRow={payrollDetailRow}
        detailAtt={payrollDetailAtt}
        onRequestPayrollSettlement={requestPayrollSettlement}
        onOpenAdvPayModal={openAdvPayModal}
        onOpenAttModal={openAttModal}
        onDeleteAttendance={handleDeleteAttendance}
      />

      <AdvancePayModal
        isOpen={advPayModal.isOpen}
        onClose={() => setAdvPayModal({ ...advPayModal, isOpen: false })}
        data={advPayModal}
        saving={savingAdvPay}
        employees={employees}
        onChange={(newData) => setAdvPayModal({ ...newData, isOpen: true })}
        onSubmit={handleSaveAdvancePay}
      />

      {/* CONFIRM DIALOG */}
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
