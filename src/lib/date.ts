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
