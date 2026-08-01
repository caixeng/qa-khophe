import type { Import, Export, WeighingSession, WeighingBag } from '../types';
import { formatNgay, formatTien, formatKg } from './utils';

const BASE_STYLE = `
  * { font-family: 'Times New Roman', serif; box-sizing: border-box; }
  body { margin: 32px; color: #000; font-size: 13pt; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; }
  .head .l { text-align:center; font-size:11pt; line-height:1.35; }
  .head .l .b { font-weight:bold; text-transform:uppercase; }
  .head .l .u { text-decoration: underline; }
  h1 { text-align:center; font-size:16pt; margin:24px 0 4px; text-transform:uppercase; }
  .sub { text-align:center; font-style:italic; margin-bottom:20px; }
  .info { margin: 4px 0; }
  .info-grid { display:flex; justify-content:space-between; gap:16px; margin: 4px 0; }
  table { width:100%; border-collapse: collapse; margin-top:12px; }
  th, td { border:1px solid #000; padding:6px 8px; font-size:12pt; }
  th { background:#f0f0f0; }
  .total-row td { font-weight:bold; background:#f7f7f7; }
  .sign { display:flex; justify-content:space-around; margin-top:48px; text-align:center; }
  .sign .role { font-weight:bold; }
  .sign .note { font-style:italic; font-size:11pt; }
  @media print { body { margin:0; } }
`;

const HEADER = `
  <div class="head">
    <div class="l">
      <div class="b">Xưởng Phế Liệu</div>
      <div class="b u">KhoPhe ERP</div>
    </div>
    <div class="l">
      <div class="b">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
      <div class="b u">Độc lập - Tự do - Hạnh phúc</div>
    </div>
  </div>
`;

function openAndPrint(html: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function esc(s: string | undefined | null): string {
  return (s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]!);
}

/** In phiếu nhập phế liệu. */
export function printPhieuNhap(item: Import) {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu nhập phế ${esc(item.id)}</title>
  <style>${BASE_STYLE}</style></head><body>
    ${HEADER}
    <h1>Phiếu nhập phế liệu</h1>
    <div class="sub">Ngày: ${formatNgay(item.date)}</div>
    <div class="info"><b>Người bán (NCC):</b> ${esc(item.contact_name) || 'Khách lẻ'}</div>
    <div class="info"><b>Loại phế liệu:</b> ${esc(item.material_type)}</div>
    <table>
      <thead><tr>
        <th>Khối lượng (kg)</th><th>Đơn giá (đ/kg)</th><th>Thành tiền (đ)</th><th>Thanh toán</th>
      </tr></thead>
      <tbody>
        <tr class="total-row">
          <td style="text-align:center">${formatKg(item.quantity_kg)}</td>
          <td style="text-align:right">${formatTien(item.price_per_kg)}</td>
          <td style="text-align:right">${formatTien(item.total_amount)}</td>
          <td style="text-align:center">${item.payment_status === 'paid' ? 'Đã trả đủ' : item.payment_status === 'partial' ? 'Trả một phần' : 'Chưa trả'}</td>
        </tr>
      </tbody>
    </table>
    ${item.notes ? `<div class="info" style="margin-top:8px"><b>Ghi chú:</b> ${esc(item.notes)}</div>` : ''}
    <div class="sign">
      <div><div class="role">Người bán</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người nhận hàng</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`;
  openAndPrint(html);
}

/** In phiếu xuất phế liệu (bán thành phẩm). */
export function printPhieuXuat(item: Export) {
  const totalKg = item.total_kg || 0;
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu xuất phế ${esc(item.id)}</title>
  <style>${BASE_STYLE}</style></head><body>
    ${HEADER}
    <h1>Phiếu xuất bán thành phẩm</h1>
    <div class="sub">Ngày: ${formatNgay(item.date)}</div>
    <div class="info"><b>Khách hàng:</b> ${esc(item.contact_name) || 'Khách lẻ'}</div>
    <table>
      <thead><tr>
        <th>Số bao</th><th>Khối lượng (kg)</th><th>Đơn giá (đ/kg)</th><th>Thành tiền (đ)</th><th>Thanh toán</th>
      </tr></thead>
      <tbody>
        <tr class="total-row">
          <td style="text-align:center">${item.bags_count}</td>
          <td style="text-align:center">${formatKg(totalKg)}</td>
          <td style="text-align:right">${formatTien(item.price_per_kg)}</td>
          <td style="text-align:right">${formatTien(item.total_amount)}</td>
          <td style="text-align:center">${item.payment_status === 'paid' ? 'Đã thu đủ' : item.payment_status === 'partial' ? 'Thu một phần' : 'Chưa thu'}</td>
        </tr>
      </tbody>
    </table>
    ${item.notes ? `<div class="info" style="margin-top:8px"><b>Ghi chú:</b> ${esc(item.notes)}</div>` : ''}
    <div class="sign">
      <div><div class="role">Khách hàng nhận</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người giao hàng</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`;
  openAndPrint(html);
}

/** In phiếu cân — chi tiết từng bao trong 1 phiên cân. */
export function printPhieuCan(session: WeighingSession, bags: WeighingBag[]) {
  const sorted = [...bags].sort((a, b) => a.bag_number - b.bag_number);
  const rows = sorted
    .map(
      (b) => `
      <tr>
        <td style="text-align:center">${b.bag_number}</td>
        <td style="text-align:center">${formatKg(b.weight_kg)}</td>
        <td>${esc(b.notes) || '—'}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu cân ${esc(session.id)}</title>
  <style>${BASE_STYLE}</style></head><body>
    ${HEADER}
    <h1>Phiếu cân phế liệu</h1>
    <div class="sub">Ngày: ${formatNgay(session.date)}</div>
    <div class="info"><b>Loại phế liệu:</b> ${esc(session.material_type)}</div>
    <div class="info-grid">
      <span><b>Tổng số bao:</b> ${session.total_bags}</span>
      <span><b>Tổng khối lượng:</b> ${formatKg(session.total_kg || 0)}</span>
    </div>
    <table>
      <thead><tr>
        <th style="width:15%">Bao số</th><th style="width:25%">Khối lượng</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="3" style="text-align:center;font-style:italic">Chưa có bao nào</td></tr>'}</tbody>
    </table>
    ${session.notes ? `<div class="info" style="margin-top:8px"><b>Ghi chú phiên cân:</b> ${esc(session.notes)}</div>` : ''}
    <div class="sign">
      <div><div class="role">Người cân</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người kiểm tra</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`;
  openAndPrint(html);
}
