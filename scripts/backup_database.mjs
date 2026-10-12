// Export a consistent snapshot of public business data. Auth credentials and Storage files
// require the Supabase backup/recovery tools separately. Never commit the output.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const env = process.loadEnvFile
  ? (() => {
      try {
        process.loadEnvFile();
      } catch {}
      return process.env;
    })()
  : process.env;
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN in the environment or .env.');
const project = env.SUPABASE_PROJECT_REF || 'ageezcxrthqmmacnrqpf';
async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`Database export failed (${response.status}).`);
  return response.json();
}
const tables = await query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
const quoted = (name) => '"' + name.replaceAll('"', '""') + '"';
const parts = tables.map(
  ({ tablename }) =>
    `'${tablename.replaceAll("'", "''")}',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.${quoted(tablename)} t)`,
);
const [result] = await query(
  `SELECT jsonb_build_object(${parts.join(',')}) AS data, (SELECT jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version) FROM supabase_migrations.schema_migrations) AS migrations`,
);
if (!result?.data || Object.keys(result.data).length !== tables.length)
  throw new Error('Incomplete export; no file written.');
const payload = {
  format: 1,
  project,
  createdAt: new Date().toISOString(),
  scope: 'public-business-data-only',
  migrations: result.migrations,
  tables: result.data,
};
const serialized = JSON.stringify(payload);
const output = resolve('.backups', `qa-khophe-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
mkdirSync(resolve('.backups'), { recursive: true });
writeFileSync(output, serialized, { mode: 0o600, flag: 'wx' });
const digest = createHash('sha256').update(readFileSync(output)).digest('hex');
writeFileSync(output + '.sha256', digest + '\n', { mode: 0o600, flag: 'wx' });
console.log(`Business backup saved: ${output}`);
console.log(
  `Tables: ${tables.length}; rows: ${Object.values(result.data).reduce((sum, rows) => sum + rows.length, 0)}; SHA-256 verified: ${digest}`,
);
