import React from 'react';
import { Calendar, DollarSign } from 'lucide-react';
import { cn, formatTien } from '../../../lib/utils';
import { DataState } from '../../../components/DataState';
import { MobileCardList } from '../../../components/mobile/MobileCardList';

interface PayrollTabProps {
  payrollLoading: boolean;
  payrollError: string | null;
  payrollMonth: string;
  setPayrollMonth: (month: string) => void;
  payroll: any; // Result from computePayroll
  onOpenAdvPayModal: (employeeId?: string, employeeName?: string) => void;
  setPayrollDetailKey: (key: string) => void;
  requestPayrollSettlement: (employeeId: string, name: string) => void;
}

export const PayrollTab: React.FC<PayrollTabProps> = ({
  payrollLoading,
  payrollError,
  payrollMonth,
  setPayrollMonth,
  payroll,
  onOpenAdvPayModal,
  setPayrollDetailKey,
  requestPayrollSettlement,
}) => {
  return (
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
              onClick={() => onOpenAdvPayModal()}
              className="tap-target min-h-11 px-3 py-1.5 rounded-xl text-xs font-black text-amber-900 bg-amber-400 hover:bg-amber-500 dark:text-amber-100 dark:bg-amber-700/80 hover:dark:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <DollarSign size={14} />+ Ứng Lương
            </button>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-[var(--text-muted)]">
              Tổng công: <b className="font-mono text-[var(--text-primary)]">{payroll.totals.shifts}</b>
            </span>
            <span className="text-[var(--text-muted)]">
              Tổng gộp:{' '}
              <b className="font-mono text-[var(--text-primary)]">{formatTien(payroll.totals.gross)}</b>
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
                    {payroll.rows.map((r: any) => (
                      <tr
                        key={r.key}
                        onClick={() => setPayrollDetailKey(r.key)}
                        className="tr-hover cursor-pointer"
                        title="Bấm để xem chi tiết chấm công & lương"
                      >
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
                                onOpenAdvPayModal(r.employee_id, r.name);
                              }}
                              className="tap-target min-h-11 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800/60 rounded hover:bg-amber-400 cursor-pointer transition-colors duration-200"
                              title={`Ghi nhận ứng lương cho ${r.name}`}
                            >
                              + Ứng
                            </button>
                          </div>
                        </td>
                        <td className="td-cell text-right font-mono text-xs font-black">
                          {r.net < 0 ? (
                            <span
                              className="text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800/40 font-bold"
                              title="Nhân viên đã ứng trước nhiều hơn tiền công tháng này"
                            >
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
                                  className="tap-target min-h-11 px-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors duration-200"
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
                      <td className="td-cell text-right font-mono text-xs">
                        {payroll.totals.overtime_hours} giờ
                      </td>
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
              items={payroll.rows.map((row: any) => ({
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
                            onOpenAdvPayModal(row.employee_id, row.name);
                          }}
                          className="tap-target min-h-11 px-2 py-0.5 text-[11px] font-black text-amber-900 bg-amber-300 dark:text-amber-100 dark:bg-amber-800/80 rounded-lg border border-amber-400 hover:bg-amber-400 cursor-pointer shadow-xs transition-colors duration-200"
                        >
                          + Ứng lương
                        </button>
                      </div>
                    ),
                  },
                  {
                    label: row.net < 0 ? 'NV nợ xưởng' : 'Thực lĩnh còn nợ',
                    value: (
                      <span
                        className={cn(
                          'font-mono font-bold',
                          row.net < 0 ? 'text-amber-700' : 'text-rose-600',
                        )}
                      >
                        {formatTien(row.net < 0 ? Math.abs(row.net) : row.unpaid)}
                      </span>
                    ),
                  },
                ],
                actions:
                  row.unpaid > 0 && row.employee_id ? (
                    <button
                      type="button"
                      onClick={() => requestPayrollSettlement(row.employee_id, row.name)}
                      className="tap-target min-h-11 px-3 rounded-xl bg-emerald-600 text-white text-xs font-extrabold transition-colors duration-200"
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
  );
};
