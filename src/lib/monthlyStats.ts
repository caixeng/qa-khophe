/**
 * Helper tính toán và tổng hợp dữ liệu hoạt động theo tháng cho Dashboard (KhoPhe ERP)
 */

export interface MonthlyStatItem {
  month: string; // '2026-10'
  label: string; // 'Thg 10/26'
  shortLabel: string; // 'T10'
  importKg: number;
  groundKg: number;
  exportKg: number;
  exportBags: number;
  importCost: number;
  revenue: number;
  operatingCost: number;
  profit: number;
}

export interface MonthlyGrowth {
  pct: number | null;
  diff: number;
}

/**
 * Trả về danh sách n tháng liên tiếp tính đến anchorDate (mặc định hôm nay).
 * Định dạng: 'YYYY-MM', sắp xếp theo thứ tự thời gian tăng dần (cũ -> mới).
 */
export function getRecentMonths(count = 6, anchorDate = new Date()): string[] {
  const result: string[] = [];
  const base = new Date(anchorDate);
  const currentYear = base.getFullYear();
  const currentMonth = base.getMonth(); // 0 - 11

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${y}-${m}`);
  }

  return result;
}

/**
 * Rút gọn hiển thị tháng cho biểu đồ
 */
export function formatMonthLabel(monthStr: string, isShort = false): string {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [y, m] = monthStr.split('-');
  const monthNum = parseInt(m, 10);
  if (isShort) {
    return `T${monthNum}`;
  }
  const shortYear = y.slice(2);
  return `Thg ${monthNum}/${shortYear}`;
}

/**
 * Rút gọn số khối lượng cho trục Y trên màn hình nhỏ / mobile
 * Ví dụ: 15.000 kg -> 15t (tấn); 500 kg -> 500kg
 */
export function formatCompactWeight(kg: number): string {
  if (!Number.isFinite(kg) || kg === 0) return '0';
  const abs = Math.abs(kg);
  const sign = kg < 0 ? '-' : '';

  if (abs >= 1000) {
    const tons = abs / 1000;
    const formatted = tons >= 10 ? Math.round(tons) : tons.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}t`;
  }
  return `${sign}${Math.round(abs)}kg`;
}

/**
 * Rút gọn số tiền cho trục Y trên màn hình nhỏ / mobile
 * Ví dụ: 150.000.000 -> 150tr; 1.500.000.000 -> 1.5tỷ
 */
export function formatCompactMoney(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    const formatted = b >= 10 ? Math.round(b) : b.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted} tỷ`;
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const formatted = m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k`;
  }
  return `${sign}${Math.round(abs)}`;
}

/**
 * Tính % tăng trưởng giữa 2 số
 */
export function computeGrowth(curr: number, prev: number): MonthlyGrowth {
  const diff = curr - prev;
  if (!prev || prev === 0) {
    return { pct: null, diff };
  }
  const pct = Math.round((diff / Math.abs(prev)) * 1000) / 10;
  return { pct, diff };
}

interface RawImport {
  date: string;
  quantity_kg?: number | string | null;
  total_amount?: number | string | null;
}

interface RawExport {
  date: string;
  total_kg?: number | string | null;
  bags_count?: number | string | null;
  total_amount?: number | string | null;
}

interface RawGrinding {
  date: string;
  output_qty_kg?: number | string | null;
}

interface RawExpense {
  date: string;
  amount?: number | string | null;
}

interface RawAttendance {
  date: string;
  net_pay?: number | string | null;
  advance_pay?: number | string | null;
}

/**
 * Tổng hợp dữ liệu theo danh sách tháng
 */
export function aggregateMonthlyStats(params: {
  months: string[];
  imports: RawImport[];
  exports: RawExport[];
  grinding: RawGrinding[];
  expenses: RawExpense[];
  attendance?: RawAttendance[];
}): MonthlyStatItem[] {
  const { months, imports, exports, grinding, expenses, attendance = [] } = params;

  // Khởi tạo map cho các tháng cần tính
  const map = new Map<string, MonthlyStatItem>();
  for (const m of months) {
    map.set(m, {
      month: m,
      label: formatMonthLabel(m, false),
      shortLabel: formatMonthLabel(m, true),
      importKg: 0,
      groundKg: 0,
      exportKg: 0,
      exportBags: 0,
      importCost: 0,
      revenue: 0,
      operatingCost: 0,
      profit: 0,
    });
  }

  // Cộng dồn Nhập phế
  for (const item of imports) {
    if (!item?.date) continue;
    const m = item.date.slice(0, 7);
    const stat = map.get(m);
    if (stat) {
      stat.importKg += Number(item.quantity_kg) || 0;
      stat.importCost += Number(item.total_amount) || 0;
    }
  }

  // Cộng dồn Xuất phế
  for (const item of exports) {
    if (!item?.date) continue;
    const m = item.date.slice(0, 7);
    const stat = map.get(m);
    if (stat) {
      stat.exportKg += Number(item.total_kg) || 0;
      stat.exportBags += Number(item.bags_count) || 0;
      stat.revenue += Number(item.total_amount) || 0;
    }
  }

  // Cộng dồn Xay phế
  for (const item of grinding) {
    if (!item?.date) continue;
    const m = item.date.slice(0, 7);
    const stat = map.get(m);
    if (stat) {
      stat.groundKg += Number(item.output_qty_kg) || 0;
    }
  }

  // Cộng dồn Chi phí xưởng
  for (const item of expenses) {
    if (!item?.date) continue;
    const m = item.date.slice(0, 7);
    const stat = map.get(m);
    if (stat) {
      stat.operatingCost += Number(item.amount) || 0;
    }
  }

  // Cộng dồn Chi phí lương thợ/nhân viên
  for (const item of attendance) {
    if (!item?.date) continue;
    const m = item.date.slice(0, 7);
    const stat = map.get(m);
    if (stat) {
      const netPay = Number(item.net_pay) || 0;
      const advancePay = Number(item.advance_pay) || 0;
      stat.operatingCost += netPay + advancePay;
    }
  }

  // Tính lợi nhuận = Doanh thu xuất - Tiền mua phế - Chi phí vận hành
  for (const stat of map.values()) {
    stat.profit = stat.revenue - stat.importCost - stat.operatingCost;
  }

  return months.map((m) => map.get(m)!);
}
