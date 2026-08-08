import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

const supabase = createClient(url, key);

async function syncEmployees() {
  console.log('1. Signing in as admin@khophe.vn...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@khophe.vn',
    password: '123456',
  });

  if (authErr || !authData.session) {
    console.error('Failed to sign in:', authErr);
    process.exit(1);
  }

  console.log('Successfully signed in as:', authData.user?.email);

  console.log('2. Checking current employees in DB...');
  const { data: currentEmployees, error: fetchErr } = await supabase.from('employees').select('*');
  if (fetchErr) {
    console.error('Error fetching employees:', fetchErr);
    process.exit(1);
  }
  console.log('Current employees in DB:', currentEmployees?.map(e => e.name));

  console.log('3. Deleting current employees from DB...');
  if (currentEmployees && currentEmployees.length > 0) {
    // Unlink attendance first if any
    await supabase.from('attendance').update({ employee_id: null }).not('id', 'is', null);

    const ids = currentEmployees.map(e => e.id);
    const { error: delErr } = await supabase.from('employees').delete().in('id', ids);
    if (delErr) {
      console.error('Error deleting employees:', delErr);
      process.exit(1);
    }
  }

  console.log('4. Inserting 8 new employees into DB...');
  const newEmployees = [
    { name: 'Phạm Xuân Tú', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Võ Thị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng (Võ Thị Hoa)' },
    { name: 'Trần Quốc Mạnh', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Phan Văn Hoàng', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Bùi Xuân Lệ', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Anh Tiếp', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Anh Tam', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng' },
    { name: 'Chị Hoa', role: 'staff', daily_salary: 350000, status: 'active', notes: 'Nhân viên xưởng (Chị Hoa)' },
  ];

  const { data: inserted, error: insErr } = await supabase
    .from('employees')
    .insert(newEmployees)
    .select();

  if (insErr) {
    console.error('Error inserting employees:', insErr);
    process.exit(1);
  }

  console.log('✅ SUCCESS! Successfully inserted 8 employees into Supabase DB:');
  console.table(inserted.map(e => ({ ID: e.id, Name: e.name, Role: e.role, DailySalary: e.daily_salary })));
}

syncEmployees();
