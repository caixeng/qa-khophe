import * as React from 'react';
import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Package, Truck, Wallet, TrendingUp, Printer } from 'lucide-react';
import { cn, formatTien, formatNgay, formatKg } from '../lib/utils';
import { DataState } from '../components/DataState';
import { StatusBadge } from '../components/StatusBadge';
import { PeriodFilter } from '../components/PeriodFilter';
import { useAsyncData, useAsyncList } from '../hooks/useAsyncData';
import { useDateRange } from '../hooks/useDateRange';
import { useAuth } from '../contexts/auth';
import { contactsService } from '../services/contactsService';
import { importsService } from '../services/importsService';
import { exportsService } from '../services/exportsService';
import { paymentsService } from '../services/paymentsService';
import { computeRemainingWithLegacyStatus } from '../lib/calc';
import { printPhieuNhap, printPhieuXuat } from '../lib/print';

/**
 * Hồ sơ một đối tác: số dư công nợ + toàn bộ lịch sử giao dịch.
 *
 * Trước đây muốn biết "còn nợ ông Hoàn bao nhiêu" phải mở trang Công nợ rồi tự
 * lọc mắt qua danh sách chung. Gom về một trang để lúc đối chiếu tiền với nhà
 * cung cấp tại xưởng chỉ cần mở đúng một màn hình.
 */
export const DoiTacChiTietPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeFinance = user?.role === 'manager' || user?.role === 'admin';
  const { range, setRange } = useDateRange();

  const {
    data: contact,
    loading: cLoading,
    error: cError,
  } = useAsyncData(() => contactsService.getById(id), [id]);

  const { data: imports, loading: iLoading } = useAsyncList(
    () => importsService.getAll({ from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const { data: exports, loading: eLoading } = useAsyncList(
    () => exportsService.getAll({ from: range.from, to: range.to }),
    [range.from, range.to],
  );

  const { data: paidImports } = useAsyncData(() => paymentsService.getPaidByRefType('import'), []);
  const { data: paidExports } = useAsyncData(() => paymentsService.getPaidByRefType('export'), []);

  const paidByImport = useMemo(() => paidImports ?? {}, [paidImports]);
  const paidByExport = useMemo(() => paidExports ?? {}, [paidExports]);

  const myImports = useMemo(() => imports.filter((i) => i.contact_id === id), [imports, id]);
  const myExports = useMemo(() => exports.filter((e) => e.contact_id === id), [exports, id]);

  const summary = useMemo(() => {
    const importKg = myImports.reduce((s, i) => s + (Number(i.quantity_kg) || 0), 0);
    const importAmount = myImports.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const exportKg = myExports.reduce((s, e) => s + (Number(e.total_kg) || 0), 0);
    const exportAmount = myExports.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);

    // Phải trả: tiền hàng mình mua của họ mà chưa trả hết.
    const payable = myImports.reduce(
      (s, i) =>
        s + computeRemainingWithLegacyStatus(i.total_amount, paidByImport[i.id] || 0, i.payment_status),
      0,
    );
    // Phải thu: tiền hàng họ mua của mình mà chưa trả hết.
    const receivable = myExports.reduce(
      (s, e) =>
        s + computeRemainingWithLegacyStatus(e.total_amount, paidByExport[e.id] || 0, e.payment_status),
      0,
    );

    return { importKg, importAmount, exportKg, exportAmount, payable, receivable };
  }, [myImports, myExports, paidByImport, paidByExport]);

  const loading = cLoading || iLoading || eLoading;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/danh-ba')}
          aria-label="Quay lại danh bạ"
          className="icon-action border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--primary-600)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-[var(--text-primary)]">
            {contact?.name || 'Đối tác'}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {contact?.type === 'supplier'
              ? 'Nhà cung cấp phế'
              : contact?.type === 'customer'
                ? 'Khách hàng mua phế'
                : 'Đối tác'}
          </p>
        </div>
      </div>

      <DataState loading={loading} error={cError} isEmpty={!contact}>
        {contact && (
          <>
            {/* Thông tin liên hệ */}
            <div className="card flex flex-wrap items-center gap-4 bg-[var(--bg-surface)] p-4">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 rounded-xl border border-[var(--primary-500)]/30 bg-[var(--primary-50)] px-3 py-2 text-xs font-bold text-[var(--primary-600)]"
                >
                  <Phone size={15} /> {contact.phone}
                </a>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Chưa có số điện thoại</span>
              )}

              {contact.address && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <MapPin size={14} className="text-[var(--text-muted)]" /> {contact.address}
                </span>
              )}

              {contact.default_price_per_kg ? (
                <span className="text-xs text-[var(--text-secondary)]">
                  Giá thoả thuận:{' '}
                  <b className="font-mono text-[var(--primary-600)]">
                    {formatTien(contact.default_price_per_kg)}/kg
                  </b>
                </span>
              ) : null}

              <Link
                to="/danh-ba"
                className="ml-auto text-xs font-bold text-[var(--primary-500)] hover:underline"
              >
                Sửa thông tin
              </Link>
            </div>

            <PeriodFilter range={range} onChange={setRange} />

            {/* Số dư */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card flex items-center gap-3 bg-[var(--bg-surface)] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Đã nhập</p>
                  <p className="font-mono text-lg font-black">{formatKg(summary.importKg)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatTien(summary.importAmount)}</p>
                </div>
              </div>

              <div className="card flex items-center gap-3 bg-[var(--bg-surface)] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Đã xuất</p>
                  <p className="font-mono text-lg font-black">{formatKg(summary.exportKg)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatTien(summary.exportAmount)}</p>
                </div>
              </div>

              {canSeeFinance && (
                <>
                  <div className="card flex items-center gap-3 bg-[var(--bg-surface)] p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
                        Mình còn nợ họ
                      </p>
                      <p className="font-mono text-lg font-black text-amber-600">
                        {formatTien(summary.payable)}
                      </p>
                    </div>
                  </div>

                  <div className="card flex items-center gap-3 bg-[var(--bg-surface)] p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
                        Họ còn nợ mình
                      </p>
                      <p className="font-mono text-lg font-black text-rose-600">
                        {formatTien(summary.receivable)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Lịch sử nhập */}
            {myImports.length > 0 && (
              <div className="erp-table-container">
                <h2 className="border-b border-[var(--border-color)] px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                  Phiếu nhập từ đối tác này ({myImports.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Lịch sử phiếu nhập</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="th-cell">
                          Ngày
                        </th>
                        <th className="th-cell text-right">Khối lượng</th>
                        <th className="th-cell text-right">Đơn giá</th>
                        <th className="th-cell text-right">Thành tiền</th>
                        {canSeeFinance && <th className="th-cell text-right">Còn nợ</th>}
                        <th scope="col" className="th-cell">
                          Thanh toán
                        </th>
                        <th className="th-cell text-right">In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myImports.map((i) => {
                        const remaining = computeRemainingWithLegacyStatus(
                          i.total_amount,
                          paidByImport[i.id] || 0,
                          i.payment_status,
                        );
                        return (
                          <tr key={i.id} className="tr-hover">
                            <td className="td-cell font-mono text-xs">{formatNgay(i.date)}</td>
                            <td className="td-cell text-right font-mono text-xs">
                              {formatKg(i.quantity_kg)}
                            </td>
                            <td className="td-cell text-right font-mono text-xs">
                              {formatTien(i.price_per_kg)}
                            </td>
                            <td className="td-cell text-right font-mono text-xs font-bold">
                              {formatTien(i.total_amount)}
                            </td>
                            {canSeeFinance && (
                              <td
                                className={cn(
                                  'td-cell text-right font-mono text-xs font-bold',
                                  remaining > 0 ? 'text-amber-600' : 'text-emerald-600',
                                )}
                              >
                                {remaining > 0 ? formatTien(remaining) : '—'}
                              </td>
                            )}
                            <td className="td-cell">
                              <StatusBadge status={i.payment_status} />
                            </td>
                            <td className="td-cell text-right">
                              <button
                                onClick={() => printPhieuNhap(i)}
                                title="In phiếu nhập"
                                className="icon-action text-[var(--text-muted)] hover:text-[var(--primary-600)]"
                              >
                                <Printer size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lịch sử xuất */}
            {myExports.length > 0 && (
              <div className="erp-table-container">
                <h2 className="border-b border-[var(--border-color)] px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                  Phiếu xuất cho đối tác này ({myExports.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Lịch sử phiếu xuất</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="th-cell">
                          Ngày
                        </th>
                        <th className="th-cell text-right">Số bao</th>
                        <th className="th-cell text-right">Khối lượng</th>
                        <th className="th-cell text-right">Thành tiền</th>
                        {canSeeFinance && <th className="th-cell text-right">Còn nợ</th>}
                        <th scope="col" className="th-cell">
                          Thanh toán
                        </th>
                        <th className="th-cell text-right">In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myExports.map((e) => {
                        const remaining = computeRemainingWithLegacyStatus(
                          e.total_amount,
                          paidByExport[e.id] || 0,
                          e.payment_status,
                        );
                        return (
                          <tr key={e.id} className="tr-hover">
                            <td className="td-cell font-mono text-xs">{formatNgay(e.date)}</td>
                            <td className="td-cell text-right font-mono text-xs">{e.bags_count}</td>
                            <td className="td-cell text-right font-mono text-xs">
                              {formatKg(e.total_kg || 0)}
                            </td>
                            <td className="td-cell text-right font-mono text-xs font-bold">
                              {formatTien(e.total_amount)}
                            </td>
                            {canSeeFinance && (
                              <td
                                className={cn(
                                  'td-cell text-right font-mono text-xs font-bold',
                                  remaining > 0 ? 'text-rose-600' : 'text-emerald-600',
                                )}
                              >
                                {remaining > 0 ? formatTien(remaining) : '—'}
                              </td>
                            )}
                            <td className="td-cell">
                              <StatusBadge status={e.payment_status} />
                            </td>
                            <td className="td-cell text-right">
                              <button
                                onClick={() => printPhieuXuat(e)}
                                title="In phiếu xuất"
                                className="icon-action text-[var(--text-muted)] hover:text-[var(--primary-600)]"
                              >
                                <Printer size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {myImports.length === 0 && myExports.length === 0 && (
              <div className="card bg-[var(--bg-surface)] py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Không có giao dịch nào với đối tác này trong kỳ đã chọn.
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Thử mở rộng khoảng ngày ở bộ lọc phía trên.
                </p>
              </div>
            )}
          </>
        )}
      </DataState>
    </div>
  );
};
