/**
 * Chạy một file migration lên Supabase qua Management API.
 *
 *   node scripts/run_migration.mjs supabase/migrations/009_contact_pricing.sql
 *   node scripts/run_migration.mjs --check          (chỉ chạy truy vấn kiểm tra, không sửa gì)
 *
 * Token đọc từ biến môi trường SUPABASE_ACCESS_TOKEN, hoặc từ file
 * `.supabase-token` ở gốc dự án (file này phải nằm trong .gitignore).
 *
 * Vì sao cần Management API: anon key trong .env chỉ đọc/ghi dữ liệu qua
 * PostgREST và bị RLS chặn — nó không chạy được DDL (ALTER TABLE). Muốn đổi
 * cấu trúc bảng thì phải qua SQL Editor trên dashboard hoặc endpoint này.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ageezcxrthqmmacnrqpf';

/** Đọc một khoá từ file .env mà không cần thư viện ngoài. */
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

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();

  const fromEnv = fromEnvFile('SUPABASE_ACCESS_TOKEN');
  if (fromEnv) return fromEnv;

  const file = resolve(process.cwd(), '.supabase-token');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();

  console.error(
    'Thiếu access token.\n' +
      'Lấy tại https://supabase.com/dashboard/account/tokens rồi thêm dòng\n' +
      'SUPABASE_ACCESS_TOKEN=sbp_... vào file .env.',
  );
  process.exit(1);
}

async function runSql(token, query, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`\n❌ ${label} THẤT BẠI (HTTP ${res.status})`);
    console.error(text);
    process.exit(1);
  }

  console.log(`\n✅ ${label}`);
  try {
    const rows = JSON.parse(text);
    if (Array.isArray(rows) && rows.length > 0) console.table(rows);
    else if (Array.isArray(rows)) console.log('   (không có dòng nào trả về)');
    else console.log(text);
  } catch {
    console.log(text);
  }
}

/** Truy vấn chẩn đoán — chỉ ĐỌC, không sửa gì. */
const CHECKS = [
  {
    label: 'Policy còn mở toang (phải rỗng)',
    sql: `SELECT tablename, policyname FROM pg_policies
          WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true')`,
  },
  {
    label: 'Phiếu xay sai vật lý: ra nhiều hơn vào',
    sql: `SELECT id, date, worker, input_qty_kg, output_qty_kg,
                 (output_qty_kg - input_qty_kg) AS chenh_lech
          FROM grinding
          WHERE deleted_at IS NULL AND output_qty_kg > input_qty_kg
          ORDER BY date`,
  },
  {
    label: 'Phiếu nhập nghi trùng (cùng ngày + đối tác + khối lượng)',
    sql: `SELECT date, contact_id, quantity_kg, count(*) AS so_ban_ghi
          FROM imports WHERE deleted_at IS NULL
          GROUP BY 1,2,3 HAVING count(*) > 1
          ORDER BY date`,
  },
  {
    label: 'Cột default_price_per_kg đã tồn tại chưa',
    sql: `SELECT count(*) AS co_cot FROM information_schema.columns
          WHERE table_schema='public' AND table_name='contacts'
            AND column_name='default_price_per_kg'`,
  },
];

const token = readToken();
const arg = process.argv[2];

if (!arg || arg === '--check') {
  console.log(`Kiểm tra project ${PROJECT_REF} (chỉ đọc, không sửa gì)...`);
  for (const c of CHECKS) await runSql(token, c.sql, c.label);
} else {
  const path = resolve(process.cwd(), arg);
  const sql = readFileSync(path, 'utf8');
  console.log(`Chạy ${arg} lên project ${PROJECT_REF}...`);
  await runSql(token, sql, `Migration ${arg}`);
}
