import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Đọc cấu hình từ .env thay vì hardcode.
 *
 * Anon key vốn là khoá công khai (nó nằm sẵn trong bundle JS gửi xuống trình
 * duyệt), nên để lộ nó không phải sự cố — thứ thực sự bảo vệ dữ liệu là RLS.
 * Nhưng hardcode vào mã nguồn thì mỗi lần xoay khoá lại phải đi sửa code, và
 * script sẽ âm thầm trỏ vào nhầm project nếu ai đó clone về dùng cho project
 * khác. Đọc từ .env giải quyết cả hai.
 */
function fromEnvFile(key) {
  const file = resolve(process.cwd(), '.env');
  if (!existsSync(file)) return null;

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() === key) {
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const url = process.env.VITE_SUPABASE_URL || fromEnvFile('VITE_SUPABASE_URL');
const key = process.env.VITE_SUPABASE_ANON_KEY || fromEnvFile('VITE_SUPABASE_ANON_KEY');

if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env (xem .env.example).');
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log('--- SEEDING SUPABASE DATABASE WITH ALL NOTEBOOK PAGES ---');

  // 1. Contacts
  const contactsData = [
    { name: 'Em Hoàn', type: 'supplier', phone: '0912000002', notes: 'NCC phế nhựa nano' },
    {
      name: 'Em Hồ',
      type: 'supplier',
      phone: '0918000003',
      notes: 'NCC phế nhựa nano (Huế, Hà Tĩnh, BĐồn, QTrị)',
    },
    { name: 'Nga', type: 'supplier', phone: '0977000004', notes: 'NCC phế nhựa nano' },
    { name: 'Chị Hoan', type: 'supplier', phone: '0915000009', notes: 'NCC phế nhựa nano' },
    { name: 'A. Danh', type: 'supplier', phone: '0901000001', notes: 'NCC phế nhựa nano' },
    { name: 'A. Ngâu', type: 'supplier', phone: '0905000006', notes: 'NCC phế nhựa nano (Ứng 5 tr)' },
    { name: 'Hồ Chung', type: 'supplier', phone: '0934000007', notes: 'NCC phế nhựa nano' },
    { name: 'Ph. Tuấn', type: 'supplier', phone: '0922000008', notes: 'NCC phế nhựa nano' },
    { name: 'A. Sâm', type: 'supplier', phone: '0947000010', notes: 'NCC phế nhựa nano' },
    { name: 'Đà Nẵng', type: 'supplier', phone: '0900000099', notes: 'Nguồn phế Đà Nẵng' },
    { name: 'Nhà máy Nhựa Việt', type: 'customer', phone: '0281000001', notes: 'Khách mua bột PVC tái sinh' },
  ];

  await supabase.from('contacts').upsert(contactsData, { onConflict: 'name' });
  const { data: allContacts } = await supabase.from('contacts').select('*');
  const contactMap = {};
  if (allContacts) {
    allContacts.forEach((c) => {
      contactMap[c.name] = c.id;
    });
  }

  // 2. Expenses (Sổ "Ứng - chi kho tháng 7")
  const expensesData = [
    {
      date: '2026-07-12',
      category: 'fuel',
      amount: 830000,
      description: 'Xăng 830.000đ',
      notes: 'Chi kho 12/07',
    },
    {
      date: '2026-07-13',
      category: 'parts',
      amount: 2000000,
      description: '2 trục băng tải 2.000.000đ',
      notes: 'Chi kho 13/07',
    },
    {
      date: '2026-07-13',
      category: 'other',
      amount: 85000,
      description: 'Thắp hương 85.000đ',
      notes: 'Chi kho 13/07',
    },
    {
      date: '2026-07-14',
      category: 'fuel',
      amount: 700000,
      description: 'Xăng 700.000đ',
      notes: 'Chi kho 14/07',
    },
    {
      date: '2026-07-15',
      category: 'oil',
      amount: 510000,
      description: 'Dầu máy 510.000đ',
      notes: 'Chi kho 15/07',
    },
    {
      date: '2026-07-16',
      category: 'fuel',
      amount: 400000,
      description: 'Xăng 400.000đ',
      notes: 'Chi kho 16/07',
    },
    {
      date: '2026-07-18',
      category: 'fuel',
      amount: 840000,
      description: 'Xăng 840.000đ (4 dao cắt bao phế)',
      notes: 'Chi kho 18/07',
    },
    {
      date: '2026-07-19',
      category: 'other',
      amount: 285000,
      description: '1 gói chè nấu nước 285.000đ',
      notes: 'Chi kho 19/07',
    },
    {
      date: '2026-07-20',
      category: 'fuel',
      amount: 940000,
      description: 'Xăng 940.000đ',
      notes: 'Chi kho 20/07',
    },
    {
      date: '2026-07-22',
      category: 'fuel',
      amount: 400000,
      description: 'Xăng 400.000đ',
      notes: 'Chi kho 22/07',
    },
    {
      date: '2026-07-24',
      category: 'fuel',
      amount: 700000,
      description: 'Xăng 700.000đ',
      notes: 'Chi kho 24/07',
    },
    {
      date: '2026-07-25',
      category: 'fuel',
      amount: 450000,
      description: 'Xăng 450.000đ',
      notes: 'Chi kho 25/07',
    },
    {
      date: '2026-07-26',
      category: 'fuel',
      amount: 900000,
      description: 'Xăng 900.000đ',
      notes: 'Chi kho 26/07',
    },
    {
      date: '2026-07-27',
      category: 'fuel',
      amount: 850000,
      description: 'Xăng 850.000đ',
      notes: 'Chi kho 27/07',
    },
    {
      date: '2026-07-27',
      category: 'other',
      amount: 85000,
      description: 'Thắp hương 85.000đ',
      notes: 'Chi kho 27/07',
    },
    {
      date: '2026-07-28',
      category: 'fuel',
      amount: 800000,
      description: 'Xăng 800.000đ',
      notes: 'Chi kho 28/07',
    },
    {
      date: '2026-07-30',
      category: 'fuel',
      amount: 700000,
      description: 'Xăng 700.000đ',
      notes: 'Chi kho 30/07 (Sổ ngày 29/07)',
    },
  ];
  await supabase.from('expenses').insert(expensesData);

  // 3. Advances
  const advancesData = [
    {
      date: '2026-07-18',
      amount: 10000000,
      person: 'Chủ xưởng',
      type: 'advance',
      notes: 'Ứng tiền kho 18/07',
    },
    {
      date: '2026-07-24',
      amount: 5000000,
      person: 'Chủ xưởng',
      type: 'advance',
      notes: 'Ứng tiền kho 24/07',
    },
  ];
  await supabase.from('advances').insert(advancesData);

  // 4. Weighing Sessions
  // Session 30/07
  const bags3007 = [
    960, 711, 973, 856, 871, 902, 770, 789, 820, 824, 806, 878, 849, 821, 819, 894, 755, 813, 941, 813, 981,
    876, 763, 926, 739,
  ];
  const { data: ws3007 } = await supabase
    .from('weighing_sessions')
    .insert({
      date: '2026-07-30',
      material_type: 'Cân Phế Nam (Không lết)',
      total_bags: 25,
      total_kg: 21050,
      notes: 'Không lết - 25 bao phế Nam tổng 21.050 kg (30/07)',
    })
    .select()
    .single();

  if (ws3007) {
    const bagsData30 = bags3007.map((w, idx) => ({
      session_id: ws3007.id,
      bag_number: idx + 1,
      weight_kg: w,
      notes: 'Không tốt',
    }));
    await supabase.from('weighing_bags').insert(bagsData30);
  }

  // 5. Employees
  const employeesData = [
    { name: 'Phạm Xuân Tú', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Võ Thị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng (Võ Thị Hoa)' },
    { name: 'Trần Quốc Mạnh', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Phan Văn Hoàng', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Bùi Xuân Lệ', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Anh Tiếp', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Anh Tam', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Chị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng (Chị Hoa)' },
  ];
  await supabase.from('employees').upsert(employeesData, { onConflict: 'name' });

  console.log('--- SEED SCRIPT COMPLETED SUCCESSFULLY ---');
}

seed();
