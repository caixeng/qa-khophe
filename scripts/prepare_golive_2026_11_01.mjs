// Công cụ chuẩn bị Go-Live ngày 01/11/2026 (Chuyển từ dữ liệu Demo sang Vận hành thật)
// Cách dùng:
//   1. Bắt đầu sổ mới sạch từ 01/11/2026 (giữ nguyên Danh bạ đối tác, Nhân sự, Tài khoản & Phân quyền):
//      node scripts/prepare_golive_2026_11_01.mjs --clean-start --opening-raw=0 --opening-finished=0
//   2. Xem trạng thái hiện tại (Dry-run mặc định, không xóa dữ liệu):
//      node scripts/prepare_golive_2026_11_01.mjs
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const env = process.loadEnvFile
  ? (() => {
      try {
        process.loadEnvFile(resolve('.env'));
      } catch {}
      return process.env;
    })()
  : process.env;

const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Thiếu SUPABASE_ACCESS_TOKEN trong .env');
const project = env.SUPABASE_PROJECT_REF || 'ageezcxrthqmmacnrqpf';

async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SQL query failed (${response.status}): ${errText}`);
  }
  return response.json();
}

const args = process.argv.slice(2);
const isCleanStart = args.includes('--clean-start');
const rawArg = args.find((a) => a.startsWith('--opening-raw='));
const finArg = args.find((a) => a.startsWith('--opening-finished='));
const openingRawKg = rawArg ? Number(rawArg.split('=')[1]) || 0 : 0;
const openingFinishedKg = finArg ? Number(finArg.split('=')[1]) || 0 : 0;

if (!isCleanStart) {
  console.log('=== CHẾ ĐỘ KIỂM TRA (DRY-RUN) — CHƯA XÓA DỮ LIỆU DEMO ===');
  console.log('Để dọn sạch các giao dịch Demo và bắt đầu nhập thật từ ngày 01/11/2026, chạy lệnh:');
  console.log(
    '  node scripts/prepare_golive_2026_11_01.mjs --clean-start --opening-raw=0 --opening-finished=0',
  );
  console.log(
    '(Thay 0 bằng số kg Tồn nguyên liệu và Tồn thành phẩm kiểm đếm thực tế tại xưởng sáng ngày 01/11/2026)',
  );
  process.exit(0);
}

console.log('1. Đang sao lưu toàn bộ dữ liệu hiện tại vào thư mục .backups/ trước khi làm sạch...');
execFileSync(process.execPath, [resolve('scripts/backup_database.mjs')], { stdio: 'inherit' });

console.log('2. Đang dọn dữ liệu giao dịch Demo và chốt số dư đầu kỳ 01/11/2026...');
await query(`
BEGIN;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (SELECT auth_id FROM public.users WHERE role = 'admin' AND auth_id IS NOT NULL ORDER BY created_at LIMIT 1),
    'role', 'authenticated'
  )::text,
  true
);

-- Gỡ liên kết đối soát tạm ứng trước khi xóa chứng từ
UPDATE public.expenses SET advance_id = NULL WHERE advance_id IS NOT NULL;
UPDATE public.payments SET advance_id = NULL WHERE advance_id IS NOT NULL;
UPDATE public.attendance SET advance_id = NULL, payroll_settlement_id = NULL WHERE advance_id IS NOT NULL OR payroll_settlement_id IS NOT NULL;
UPDATE public.advances SET original_advance_id = NULL WHERE original_advance_id IS NOT NULL;

-- Tạm tắt trigger khóa xóa phiếu chốt lương trong phiên làm sạch Go-Live
ALTER TABLE public.payroll_settlements DISABLE TRIGGER USER;
ALTER TABLE public.attendance DISABLE TRIGGER USER;

DELETE FROM public.payments;
DELETE FROM public.attendance;
DELETE FROM public.payroll_settlements;
DELETE FROM public.expenses;
DELETE FROM public.advances;
DELETE FROM public.stock_counts;
DELETE FROM public.weighing_bags;
DELETE FROM public.exports;
DELETE FROM public.weighing_sessions;
DELETE FROM public.grinding;
DELETE FROM public.imports;

ALTER TABLE public.payroll_settlements ENABLE TRIGGER USER;
ALTER TABLE public.attendance ENABLE TRIGGER USER;

INSERT INTO public.settings (key, value, updated_at) VALUES
  ('opening_raw_stock_kg', '${openingRawKg}', now()),
  ('opening_stock_kg', '${openingFinishedKg}', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

COMMIT;
`);

console.log('=== HOÀN TẤT CHUẨN BỊ GO-LIVE 01/11/2026 ===');
console.log(`- Giữ nguyên: Danh bạ đối tác (contacts), Nhân sự (employees), Tài khoản (users) & Phân quyền.`);
console.log(`- Tồn nguyên liệu đầu kỳ 01/11/2026: ${openingRawKg.toLocaleString('vi-VN')} kg`);
console.log(`- Tồn thành phẩm đầu kỳ 01/11/2026: ${openingFinishedKg.toLocaleString('vi-VN')} kg`);
