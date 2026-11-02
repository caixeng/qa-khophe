import{d as e,f as t,h as n}from"./SkeletonLoader-DlX1WkrR.js";var r=`
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
`,i=`
  <div class="head">
    <div class="l">
      <div class="b">Tái Chế Phế Liệu</div>
      <div class="b u">VUA PHẾ</div>
    </div>
    <div class="l">
      <div class="b">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
      <div class="b u">Độc lập - Tự do - Hạnh phúc</div>
    </div>
  </div>
`;function a(e){let t=window.open(``,`_blank`,`width=900,height=700`);if(!t){alert(`Vui lòng cho phép mở popup để in phiếu (bật Allow pop-ups trong cài đặt trình duyệt).`);return}t.document.write(e),t.document.close(),t.focus(),setTimeout(()=>t.print(),300)}function o(e){return(e??``).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function s(s){a(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu nhập phế ${o(s.id)}</title>
  <style>${r}</style></head><body>
    ${i}
    <h1>Phiếu nhập phế liệu</h1>
    <div class="sub">Ngày: ${t(s.date)}</div>
    <div class="info"><b>Người bán (NCC):</b> ${o(s.contact_name)||`Khách lẻ`}</div>
    <div class="info"><b>Loại phế liệu:</b> ${o(s.material_type)}</div>
    <table>
      <thead><tr>
        <th>Khối lượng (kg)</th><th>Đơn giá (đ/kg)</th><th>Thành tiền (đ)</th><th>Thanh toán</th>
      </tr></thead>
      <tbody>
        <tr class="total-row">
          <td style="text-align:center">${e(s.quantity_kg)}</td>
          <td style="text-align:right">${n(s.price_per_kg)}</td>
          <td style="text-align:right">${n(s.total_amount)}</td>
          <td style="text-align:center">${s.payment_status===`paid`?`Đã trả đủ`:s.payment_status===`partial`?`Trả một phần`:`Chưa trả`}</td>
        </tr>
      </tbody>
    </table>
    ${s.notes?`<div class="info" style="margin-top:8px"><b>Ghi chú:</b> ${o(s.notes)}</div>`:``}
    <div class="sign">
      <div><div class="role">Người bán</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người nhận hàng</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`)}function c(s){let c=s.total_kg||0;a(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu xuất phế ${o(s.id)}</title>
  <style>${r}</style></head><body>
    ${i}
    <h1>Phiếu xuất bán thành phẩm</h1>
    <div class="sub">Ngày: ${t(s.date)}</div>
    <div class="info"><b>Khách hàng:</b> ${o(s.contact_name)||`Khách lẻ`}</div>
    <table>
      <thead><tr>
        <th>Số bao</th><th>Khối lượng (kg)</th><th>Đơn giá (đ/kg)</th><th>Thành tiền (đ)</th><th>Thanh toán</th>
      </tr></thead>
      <tbody>
        <tr class="total-row">
          <td style="text-align:center">${s.bags_count}</td>
          <td style="text-align:center">${e(c)}</td>
          <td style="text-align:right">${n(s.price_per_kg)}</td>
          <td style="text-align:right">${n(s.total_amount)}</td>
          <td style="text-align:center">${s.payment_status===`paid`?`Đã thu đủ`:s.payment_status===`partial`?`Thu một phần`:`Chưa thu`}</td>
        </tr>
      </tbody>
    </table>
    ${s.notes?`<div class="info" style="margin-top:8px"><b>Ghi chú:</b> ${o(s.notes)}</div>`:``}
    <div class="sign">
      <div><div class="role">Khách hàng nhận</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người giao hàng</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`)}function l(n,s){let c=[...s].sort((e,t)=>e.bag_number-t.bag_number).map(t=>`
      <tr>
        <td style="text-align:center">${t.bag_number}</td>
        <td style="text-align:center">${e(t.weight_kg)}</td>
        <td>${o(t.notes)||`—`}</td>
      </tr>`).join(``);a(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
  <title>Phiếu cân ${o(n.id)}</title>
  <style>${r}</style></head><body>
    ${i}
    <h1>Phiếu cân phế liệu</h1>
    <div class="sub">Ngày: ${t(n.date)}</div>
    <div class="info"><b>Loại phế liệu:</b> ${o(n.material_type)}</div>
    <div class="info-grid">
      <span><b>Tổng số bao:</b> ${n.total_bags}</span>
      <span><b>Tổng khối lượng:</b> ${e(n.total_kg||0)}</span>
    </div>
    <table>
      <thead><tr>
        <th style="width:15%">Bao số</th><th style="width:25%">Khối lượng</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${c||`<tr><td colspan="3" style="text-align:center;font-style:italic">Chưa có bao nào</td></tr>`}</tbody>
    </table>
    ${n.notes?`<div class="info" style="margin-top:8px"><b>Ghi chú phiên cân:</b> ${o(n.notes)}</div>`:``}
    <div class="sign">
      <div><div class="role">Người cân</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Người kiểm tra</div><div class="note">(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Quản lý kho</div><div class="note">(Ký, đóng dấu)</div></div>
    </div>
  </body></html>`)}export{s as n,c as r,l as t};