import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Zap, List, Edit, Trash2 } from 'lucide-react';
import { cn, formatTien, formatNgay } from '../../../lib/utils';
import { calculateAttendancePay } from '../../../lib/payroll';
import { DataState } from '../../../components/DataState';
import { StatusBadge } from '../../../components/StatusBadge';
import { PaginationBar } from '../../../components/PaginationBar';
import { QuickAttendanceCard, type QuickAttendanceState } from '../../../components/mobile/QuickAttendanceCard';
import { MobileCardList } from '../../../components/mobile/MobileCardList';
import type { Attendance, Employee } from '../../../types';

interface AttendanceTabProps {
  attViewMode: 'quick' | 'history';
  setAttViewMode: (mode: 'quick' | 'history') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  historyMonth: string;
  setHistoryMonth: (month: string) => void;
  quickStates: Record<string, QuickAttendanceState>;
  setQuickStates: React.Dispatch<React.SetStateAction<Record<string, QuickAttendanceState>>>;
  employees: Employee[];
  empLoading: boolean;
  empError: string | null;
  historyAttendance: Attendance[];
  filteredAttendance: Attendance[];
  historyLoading: boolean;
  historyError: string | null;
  currentPage: number;
  itemsPerPage: number;
  savingAtt: boolean;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  handlePrevDate: () => void;
  handleNextDate: () => void;
  handleMarkAllFull: () => void;
  handleSaveQuickAttendance: () => void;
  onOpenAttModal: (att: Attendance) => void;
  onDeleteAttendance: (id: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  attViewMode,
  setAttViewMode,
  selectedDate,
  setSelectedDate,
  historyMonth,
  setHistoryMonth,
  quickStates,
  setQuickStates,
  employees,
  empLoading,
  empError,
  filteredAttendance,
  historyLoading,
  historyError,
  currentPage,
  itemsPerPage,
  savingAtt,
  setCurrentPage,
  setItemsPerPage,
  handlePrevDate,
  handleNextDate,
  handleMarkAllFull,
  handleSaveQuickAttendance,
  onOpenAttModal,
  onDeleteAttendance,
}) => {
  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
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
                  className="tap-target min-h-11 btn-secondary px-2.5 py-1.5 text-xs flex items-center justify-center cursor-pointer transition-colors duration-200"
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
                  className="tap-target min-h-11 input-field py-1 px-2.5 font-mono font-bold text-xs w-auto cursor-pointer transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={handleNextDate}
                  className="tap-target min-h-11 btn-secondary px-2.5 py-1.5 text-xs flex items-center justify-center cursor-pointer transition-colors duration-200"
                  title="Ngày sau"
                  aria-label="Chuyển sang ngày sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="tap-target min-h-11 btn-secondary px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors duration-200"
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
                className="tap-target min-h-11 input-field w-auto font-mono transition-colors duration-200"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {attViewMode === 'quick' && (
            <button
              type="button"
              onClick={handleMarkAllFull}
              className="tap-target min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-emerald-500 cursor-pointer active:scale-95 transition-colors duration-200"
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
                'tap-target min-h-11 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors duration-200',
                attViewMode === 'quick'
                  ? 'bg-[var(--primary-500)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]',
              )}
            >
              <Zap size={13} /> 1-Chạm
            </button>
            <button
              type="button"
              onClick={() => setAttViewMode('history')}
              aria-pressed={attViewMode === 'history'}
              className={cn(
                'tap-target min-h-11 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors duration-200',
                attViewMode === 'history'
                  ? 'bg-[var(--primary-500)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]',
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
                <Zap size={18} />
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
                    <th scope="col" className="th-cell">Ngày chấm công</th>
                    <th scope="col" className="th-cell">Tên công nhân</th>
                    <th className="th-cell text-right">Số công</th>
                    <th className="th-cell text-right">Đơn giá/ngày</th>
                    <th className="th-cell text-right">Tạm ứng</th>
                    <th className="th-cell text-right">Thực lĩnh</th>
                    <th scope="col" className="th-cell">Trạng thái thanh toán</th>
                    <th scope="col" className="th-cell">Ghi chú công</th>
                    <th className="th-cell text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((att) => (
                      <tr
                        key={att.id}
                        onClick={() => onOpenAttModal(att)}
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
                                onOpenAttModal(att);
                              }}
                              className="icon-action tap-target min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer transition-colors duration-200 rounded-lg"
                              title="Sửa"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAttendance(att.id);
                              }}
                              className="icon-action tap-target min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-rose-600 cursor-pointer transition-colors duration-200 rounded-lg"
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
                onClick: () => onOpenAttModal(att),
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
                      onClick={() => onOpenAttModal(att)}
                      className="tap-target min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)] transition-colors duration-200"
                      aria-label={`Sửa chấm công ${att.employee_name}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAttendance(att.id)}
                      className="tap-target min-h-11 min-w-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors duration-200"
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
  );
};
