import * as React from 'react';
import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Package,
  Truck,
  Wallet,
  TrendingUp,
  Printer,
  ArrowDownToLine,
  UserCheck,
  Landmark,
} from 'lucide-react';
import { cn, formatTien, formatNgay, formatKg } from '../lib/utils';
import { getSourceCategoryConfig } from '../lib/supplierSources';
import { DataState } from '../components/DataState';
import { StatusBadge } from '../components/StatusBadge';
import { MobileCardList } from '../components/mobile/MobileCardList';
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
 * Hồ sơ một đối tác / đơn vị cung cấp phế: số dư công nợ + hồ sơ nguồn hàng + toàn bộ lịch sử giao dịch.
 */
export const DoiTacChiTietPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canSeeFinance = can('dashboard.finance.view');
  const canCreateScrap = can('scrap.create');
  const { range, setRange } = useDateRange();

  const {
    data: contact,
    loading: cLoading,
    error: cError,
  } = useAsyncData(() => contactsService.getById(id), [id]);

  const {
    data: imports,
    loading: iLoading,
    error: iError,
  } = useAsyncList(() => importsService.getAll({ contactId: id, all: true }), [id]);
  const {
    data: exports,
    loading: eLoading,
    error: eError,
  } = useAsyncList(() => exportsService.getAll({ contactId: id, all: true }), [id]);

  const {
    data: paidImports,
    loading: piLoading,
    error: piError,
  } = useAsyncData(() => paymentsService.getPaidByRefType('import'), []);
  const {
    data: paidExports,
    loading: peLoading,
    error: peError,
  } = useAsyncData(() => paymentsService.getPaidByRefType('export'), []);

  const paidByImport = useMemo(() => paidImports ?? {}, [paidImports]);
  const paidByExport = useMemo(() => paidExports ?? {}, [paidExports]);

  const myImports = useMemo(
    () => imports.filter((i) => i.contact_id === id && i.date >= range.from && i.date <= range.to),
    [imports, id, range.from, range.to],
  );
  const myExports = useMemo(
    () => exports.filter((e) => e.contact_id === id && e.date >= range.from && e.date <= range.to),
    [exports, id, range.from, range.to],
  );

  const summary = useMemo(() => {
    const importKg = myImports.reduce((s, i) => s + (Number(i.quantity_kg) || 0), 0);
    const importAmount = myImports.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const exportKg = myExports.reduce((s, e) => s + (Number(e.total_kg) || 0), 0);
    const exportAmount = myExports.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);

    // Phải trả: tiền hàng mình mua của họ mà chưa trả hết.
    const payable = imports
      .filter((i) => i.contact_id === id)
      .reduce(
        (s, i) =>
          s + computeRemainingWithLegacyStatus(i.total_amount, paidByImport[i.id] || 0, i.payment_status),
        0,
      );
    // Phải thu: tiền hàng họ mua của mình mà chưa trả hết.
    const receivable = exports
      .filter((e) => e.contact_id === id)
      .reduce(
        (s, e) =>
          s + computeRemainingWithLegacyStatus(e.total_amount, paidByExport[e.id] || 0, e.payment_status),
        0,
      );

    return { importKg, importAmount, exportKg, exportAmount, payable, receivable };
  }, [myImports, myExports, imports, exports, id, paidByImport, paidByExport]);

  const loading = cLoading || iLoading || eLoading || piLoading || peLoading;
  const error = cError || iError || eError || piError || peError;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/danh-ba')}
          aria-label="Quay lại danh bạ"
          className="icon-action border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--primary-600)] cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-[var(--text-primary)]">
            {contact?.name || 'Đối tác'}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {contact?.type === 'supplier'
              ? 'Đơn vị cung cấp phế (Nguồn hàng)'
              : contact?.type === 'customer'
                ? 'Khách hàng mua phế thành phẩm'
                : 'Đối tác'}
          </p>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Sản lượng và lịch sử theo kỳ đã chọn; công nợ còn lại tính trên toàn bộ lịch sử.
      </p>
      <DataState loading={loading} error={error} isEmpty={!contact}>
        {contact && (
          <>
            {/* Thông tin hồ sơ đơn vị cung cấp / đối tác */}
            <div className="card bg-[var(--bg-surface)] p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {contact.type === 'supplier' && (
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold border',
                      getSourceCategoryConfig(contact.source_category).badgeClass,
                    )}
                  >
                    {getSourceCategoryConfig(contact.source_category).label}
                  </span>
                )}

                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 rounded-xl border border-[var(--primary-500)]/30 bg-[var(--primary-50)] px-3 py-1.5 text-xs font-bold text-[var(--primary-600)]"
                  >
                    <Phone size={14} /> {contact.phone}
                  </a>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">Chưa có số điện thoại</span>
                )}

                {contact.region && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">
                    <MapPin size={13} className="text-[var(--primary-500)]" /> Tuyến: {contact.region}
                  </span>
                )}

                {contact.address && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <MapPin size={14} className="text-[var(--text-muted)]" /> {contact.address}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {contact.type === 'supplier' && canCreateScrap && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/quan-ly-phe?tab=nhap&open=true&contactId=${encodeURIComponent(contact.id)}`,
                        )
                      }
                      className="btn-primary !min-h-8 !px-3 !py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowDownToLine size={14} />
                      <span>Ghi phiếu thu mua</span>
                    </button>
                  )}
                  <Link to="/danh-ba" className="text-xs font-bold text-[var(--primary-500)] hover:underline">
                    Danh bạ
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-color)] text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Đầu mối liên hệ tại đơn vị
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {contact.contact_person || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Người phụ trách thu mua
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                    <UserCheck size={13} /> {contact.collector_name || 'Anh Hồ'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Phế chủ lực & Đơn giá chuẩn
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {contact.main_material_type || 'Tấm nhựa nano'}{' '}
                    {contact.default_price_per_kg ? (
                      <b className="font-mono text-[var(--primary-600)]">
                        ({formatTien(contact.default_price_per_kg)}/kg)
                      </b>
                    ) : null}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Tài khoản thanh toán
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[var(--text-secondary)]">
                    <Landmark size={13} className="text-[var(--text-muted)]" />
                    {contact.bank_info || 'Tiền mặt / Chưa lưu STK'}
                  </span>
                </div>
              </div>
              {contact.notes && (
                <p className="text-xs italic text-[var(--text-muted)] pt-1">Ghi chú: {contact.notes}</p>
              )}
            </div>

            <PeriodFilter range={range} onChange={setRange} />

            {/* Số dư */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
              <div className="card flex items-center gap-2.5 bg-[var(--bg-surface)] p-3 sm:p-4 min-w-0">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600">
                  <Package size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                    Đã gom ({myImports.length} chuyến)
                  </p>
                  <p className="font-mono text-sm sm:text-lg font-black truncate">
                    {formatKg(summary.importKg)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">
                    {formatTien(summary.importAmount)}
                  </p>
                </div>
              </div>

              <div className="card flex items-center gap-2.5 bg-[var(--bg-surface)] p-3 sm:p-4 min-w-0">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600">
                  <Truck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                    Đã xuất
                  </p>
                  <p className="font-mono text-sm sm:text-lg font-black truncate">
                    {formatKg(summary.exportKg)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">
                    {formatTien(summary.exportAmount)}
                  </p>
                </div>
              </div>

              {canSeeFinance && (
                <>
                  <div className="card flex items-center gap-2.5 bg-[var(--bg-surface)] p-3 sm:p-4 min-w-0">
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600">
                      <Wallet size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                        Mình còn nợ họ
                      </p>
                      <p className="font-mono text-sm sm:text-lg font-black text-amber-600 truncate">
                        {formatTien(summary.payable)}
                      </p>
                    </div>
                  </div>

                  <div className="card flex items-center gap-2.5 bg-[var(--bg-surface)] p-3 sm:p-4 min-w-0">
                    <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600">
                      <TrendingUp size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-bold uppercase text-[var(--text-muted)] truncate">
                        Họ còn nợ mình
                      </p>
                      <p className="font-mono text-sm sm:text-lg font-black text-rose-600 truncate">
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
                  Lịch sử thu mua từ đơn vị này ({myImports.length} chuyến)
                </h2>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left border-collapse">
                    <caption className="sr-only">Lịch sử phiếu nhập</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="th-cell">
                          Ngày
                        </th>
                        <th scope="col" className="th-cell">
                          Loại phế & Chuyến thu gom
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
                            <td className="td-cell text-xs">
                              <span className="font-bold text-[var(--text-primary)] block">
                                {i.material_type}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                Thu mua: {i.collector_name || 'Anh Hồ'}
                                {i.vehicle_info ? ` • ${i.vehicle_info}` : ''}
                                {i.supplier_slip_code ? ` • Phiếu: ${i.supplier_slip_code}` : ''}
                              </span>
                            </td>
                            <td className="td-cell text-right font-mono text-xs font-bold">
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
                                className="icon-action text-[var(--text-muted)] hover:text-[var(--primary-600)] cursor-pointer"
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
                <div className="p-3 lg:hidden">
                  <MobileCardList
                    items={myImports.map((item) => {
                      const remaining = computeRemainingWithLegacyStatus(
                        item.total_amount,
                        paidByImport[item.id] || 0,
                        item.payment_status,
                      );
                      return {
                        id: item.id,
                        title: formatNgay(item.date),
                        subtitle: `${item.material_type} • ${item.collector_name || 'Anh Hồ'}`,
                        badge: <StatusBadge status={item.payment_status} />,
                        accentColor: remaining > 0 ? '#f59e0b' : '#10b981',
                        fields: [
                          { label: 'Khối lượng', value: formatKg(item.quantity_kg) },
                          { label: 'Đơn giá', value: `${formatTien(item.price_per_kg)}/kg` },
                          {
                            label: 'Thành tiền',
                            value: <span className="font-mono">{formatTien(item.total_amount)}</span>,
                          },
                          ...(canSeeFinance
                            ? [
                                {
                                  label: 'Còn nợ',
                                  value: (
                                    <span className="font-mono text-amber-600">
                                      {remaining > 0 ? formatTien(remaining) : '—'}
                                    </span>
                                  ),
                                },
                              ]
                            : []),
                        ],
                        actions: (
                          <button
                            type="button"
                            onClick={() => printPhieuNhap(item)}
                            className="tap-target flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)]"
                            aria-label={`In phiếu nhập ngày ${formatNgay(item.date)}`}
                          >
                            <Printer size={18} />
                          </button>
                        ),
                      };
                    })}
                  />
                </div>
              </div>
            )}

            {/* Lịch sử xuất */}
            {myExports.length > 0 && (
              <div className="erp-table-container">
                <h2 className="border-b border-[var(--border-color)] px-4 py-3 text-sm font-bold text-[var(--text-primary)]">
                  Phiếu xuất cho đối tác này ({myExports.length})
                </h2>
                <div className="hidden overflow-x-auto lg:block">
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
                                className="icon-action text-[var(--text-muted)] hover:text-[var(--primary-600)] cursor-pointer"
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
                <div className="p-3 lg:hidden">
                  <MobileCardList
                    items={myExports.map((item) => {
                      const remaining = computeRemainingWithLegacyStatus(
                        item.total_amount,
                        paidByExport[item.id] || 0,
                        item.payment_status,
                      );
                      return {
                        id: item.id,
                        title: formatNgay(item.date),
                        badge: <StatusBadge status={item.payment_status} />,
                        accentColor: remaining > 0 ? '#f43f5e' : '#10b981',
                        fields: [
                          { label: 'Số bao', value: `${item.bags_count || 0} bao` },
                          { label: 'Khối lượng', value: formatKg(item.total_kg || 0) },
                          {
                            label: 'Thành tiền',
                            value: <span className="font-mono">{formatTien(item.total_amount)}</span>,
                          },
                          ...(canSeeFinance
                            ? [
                                {
                                  label: 'Còn nợ',
                                  value: (
                                    <span className="font-mono text-rose-600">
                                      {remaining > 0 ? formatTien(remaining) : '—'}
                                    </span>
                                  ),
                                },
                              ]
                            : []),
                        ],
                        actions: (
                          <button
                            type="button"
                            onClick={() => printPhieuXuat(item)}
                            className="tap-target flex items-center justify-center rounded-xl text-[var(--primary-600)] hover:bg-[var(--primary-50)]"
                            aria-label={`In phiếu xuất ngày ${formatNgay(item.date)}`}
                          >
                            <Printer size={18} />
                          </button>
                        ),
                      };
                    })}
                  />
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
