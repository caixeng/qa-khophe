import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Always creates an isolated, in-memory database. There is no production restore path.
const db = await PGlite.create();
try {
  await db.exec(readFileSync('supabase/tests/bootstrap.sql', 'utf8'));
  for (const name of readdirSync('supabase/migrations')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync('supabase/migrations/' + name, 'utf8'));
    console.log('PASS migration', name);
  }
  for (const name of readdirSync('supabase/tests')
    .filter((n) => n.endsWith('.sql') && n !== 'bootstrap.sql')
    .sort()) {
    await db.exec(readFileSync('supabase/tests/' + name, 'utf8'));
    console.log('PASS database test', name);
  }
  const backupPath = process.argv[2];
  if (backupPath) {
    const contents = readFileSync(backupPath, 'utf8');
    const digest = readFileSync(backupPath + '.sha256', 'utf8').trim();
    if (createHash('sha256').update(contents).digest('hex') !== digest)
      throw Error('Backup checksum mismatch');
    const backup = JSON.parse(contents);
    if (backup.format !== 1 || backup.scope !== 'public-business-data-only')
      throw Error('Unsupported backup');
    const metadata = await db.query(
      "SELECT c.relname AS table_name,a.attname AS column_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND a.attgenerated='' ORDER BY c.relname,a.attnum",
    );
    const names = [...new Set(metadata.rows.map((row) => row.table_name))];
    if (
      names.some((name) => !Array.isArray(backup.tables[name])) ||
      Object.keys(backup.tables).some((name) => !names.includes(name))
    )
      throw Error('Backup tables differ from current schema');
    const q = (name) => '"' + name.replaceAll('"', '""') + '"';
    // Only this ephemeral database is cleared. Constraints/triggers are restored before verification.
    await db.exec(
      'BEGIN; SET LOCAL session_replication_role=replica; TRUNCATE ' +
        names.map((name) => 'public.' + q(name)).join(',') +
        ' CASCADE;',
    );
    for (const name of names) {
      const columns = metadata.rows
        .filter((row) => row.table_name === name)
        .map((row) => q(row.column_name))
        .join(',');
      await db.query(
        `INSERT INTO public.${q(name)} (${columns}) SELECT ${columns} FROM jsonb_populate_recordset(NULL::public.${q(name)},$1::jsonb)`,
        [JSON.stringify(backup.tables[name])],
      );
      const result = await db.query(`SELECT count(*)::int AS count FROM public.${q(name)}`);
      if (result.rows[0].count !== backup.tables[name].length)
        throw Error('Restore row count mismatch: ' + name);
      const differences = await db.query(
        `WITH original AS (SELECT to_jsonb(b) row FROM jsonb_populate_recordset(NULL::public.${q(name)},$1::jsonb) b) SELECT count(*)::int AS count FROM ((SELECT to_jsonb(t) row FROM public.${q(name)} t EXCEPT SELECT row FROM original) UNION ALL (SELECT row FROM original EXCEPT SELECT to_jsonb(t) FROM public.${q(name)} t)) differences`,
        [JSON.stringify(backup.tables[name])],
      );
      if (differences.rows[0].count) throw Error('Restored values differ from backup: ' + name);
    }
    await db.exec('COMMIT');
    // Verify relationships after the bulk load; disabling triggers never skips the verification.
    const foreignKeys = await db.query(
      "SELECT c.conrelid::regclass::text tbl,c.confrelid::regclass::text target,a.attname col,b.attname target_col FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=c.confkey[1] WHERE c.contype='f' AND cardinality(c.conkey)=1 AND c.connamespace='public'::regnamespace",
    );
    for (const fk of foreignKeys.rows) {
      const result = await db.query(
        `SELECT count(*)::int AS count FROM ${fk.tbl} s LEFT JOIN ${fk.target} t ON s.${q(fk.col)}=t.${q(fk.target_col)} WHERE s.${q(fk.col)} IS NOT NULL AND t.${q(fk.target_col)} IS NULL`,
      );
      if (result.rows[0].count) throw Error('Broken backup reference: ' + fk.tbl + '.' + fk.col);
    }
    console.log(
      'PASS business backup restore, row counts, checksum and foreign keys:',
      names.length,
      'tables',
    );
  }
} finally {
  await db.close();
}
