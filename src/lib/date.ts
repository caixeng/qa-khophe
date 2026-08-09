/**
 * Ngày hôm nay theo GIỜ ĐỊA PHƯƠNG (yyyy-mm-dd) — dùng cho mọi form/service
 * cần "ngày hôm nay" làm giá trị mặc định.
 *
 * KHÔNG dùng `new Date().toISOString().split('T')[0]` — `toISOString()` quy
 * về giờ UTC. Ở múi giờ +07, 0h–6h59 sáng giờ Việt Nam vẫn là NGÀY HÔM TRƯỚC
 * theo UTC, nên mọi phiếu ghi trong khoảng giờ đó (đúng lúc xưởng bắt đầu ca
 * sáng) bị lùi mất một ngày — "Nhập hôm nay" trên Dashboard hiện 0 dù vừa
 * nhập xong, và phiếu bị xếp nhầm sang ngày hôm trước trong mọi báo cáo.
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toISODate(new Date());
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** Trả về ngày đầu/cuối tháng từ chuỗi yyyy-mm, không phụ thuộc múi giờ UTC. */
export function monthRange(month: string): { from: string; to: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Kỳ lương không hợp lệ.');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** Dịch một ngày yyyy-mm-dd theo lịch địa phương, tránh lỗi lệch ngày do UTC. */
export function shiftISODate(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() + amount);
  return toISODate(value);
}
