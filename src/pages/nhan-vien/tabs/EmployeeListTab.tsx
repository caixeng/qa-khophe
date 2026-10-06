import React from 'react';
import { Edit, UserMinus, Phone } from 'lucide-react';
import { cn, formatTien, formatNgay } from '../../../lib/utils';
import { DataState } from '../../../components/DataState';
import { StatusBadge } from '../../../components/StatusBadge';
import { PaginationBar } from '../../../components/PaginationBar';
import { MobileCardList } from '../../../components/mobile/MobileCardList';
import { roleLabels } from '../types';
import type { Employee } from '../../../types';

interface EmployeeListTabProps {
  loading: boolean;
  error: string | null;
  employees: Employee[];
  filteredEmployees: Employee[];
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  onOpenEmpModal: (emp?: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeeListTab: React.FC<EmployeeListTabProps> = ({
  loading,
  error,
  employees: _employees,
  filteredEmployees,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
  onOpenEmpModal,
  onDeleteEmployee,
}) => {
  return (
    <DataState loading={loading} error={error} isEmpty={filteredEmployees.length === 0}>
      <div className="card hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Danh sách hồ sơ nhân viên</caption>
            <thead>
              <tr>
                <th scope="col" className="th-cell">Tên nhân viên</th>
                <th scope="col" className="th-cell">Chức vụ</th>
                <th className="th-cell text-right">Lương công (đ/ngày)</th>
                <th scope="col" className="th-cell">Số điện thoại</th>
                <th scope="col" className="th-cell">Ngày vào làm</th>
                <th scope="col" className="th-cell">Trạng thái</th>
                <th scope="col" className="th-cell">Ghi chú</th>
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
                      onClick={() => onOpenEmpModal(emp)}
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
                              onOpenEmpModal(emp);
                            }}
                            className="icon-action tap-target min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--primary-500)] cursor-pointer transition-colors duration-200 rounded-lg"
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEmployee(emp.id);
                            }}
                            className="icon-action tap-target min-h-11 min-w-11 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-rose-600 cursor-pointer transition-colors duration-200 rounded-lg"
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
              onClick: () => onOpenEmpModal(emp),
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
                    onClick={() => onOpenEmpModal(emp)}
                    className="tap-target min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)] transition-colors duration-200"
                    aria-label={`Sửa ${emp.name}`}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEmployee(emp.id)}
                    className="tap-target min-h-11 min-w-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors duration-200"
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
  );
};
