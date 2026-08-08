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

if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('1. Checking current employees...');
  const { data: currentEmployees, error: fetchErr } = await supabase.from('employees').select('*');
  if (fetchErr) {
    console.error('Error fetching employees:', fetchErr);
    process.exit(1);
  }
  console.log('Current employees:', currentEmployees);

  console.log('2. Checking attendance table for foreign key references...');
  const { data: attendance, error: attErr } = await supabase.from('attendance').select('*');
  if (attErr) console.warn('Attendance fetch notice:', attErr);
  else console.log('Current attendance count:', attendance?.length || 0);

  // Unlink or delete attendance records referencing employees if any
  if (attendance && attendance.length > 0) {
    console.log('Clearing attendance references or records...');
    const { error: clearAttErr } = await supabase.from('attendance').delete().not('id', 'is', null);
    if (clearAttErr) {
      console.warn('Could not clear attendance:', clearAttErr);
      // Try setting employee_id to null
      await supabase.from('attendance').update({ employee_id: null }).not('id', 'is', null);
    }
  }

  console.log('3. Deleting current employees...');
  if (currentEmployees && currentEmployees.length > 0) {
    const { error: delErr } = await supabase.from('employees').delete().not('id', 'is', null);
    if (delErr) {
      console.error('Error deleting employees:', delErr);
      process.exit(1);
    }
  }

  console.log('4. Inserting new employees from handwritten list...');
  const newEmployees = [
    { name: 'Phạm Xuân Tú', role: 'staff', status: 'active', daily_salary: 350000 },
    { name: 'Võ Thị Hoa', role: 'staff', status: 'active', daily_salary: 350000 },
    { name: 'Trần Quốc Mạnh', role: 'staff', status: 'active', daily_salary: 350000 },
    { name: 'Phan Văn Hoàng', role: 'staff', status: 'active', daily_salary: 350000 },
    { name: 'Bùi Xuân Lệ', role: 'staff', status: 'active', daily_salary: 350000 },
  ];

  const { data: inserted, error: insErr } = await supabase
    .from('employees')
    .insert(newEmployees)
    .select();

  if (insErr) {
    console.error('Error inserting new employees:', insErr);
    process.exit(1);
  }

  console.log('✅ Successfully inserted new employees:', inserted);
}

run();
