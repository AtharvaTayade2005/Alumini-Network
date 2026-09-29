import { query, closePool } from '../config/database.js'

const tables = await query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`)
console.log(`TABLES (${tables.rows.length}): ${tables.rows.map((r) => r.table_name).join(', ')}`)

const indexes = await query(
  "SELECT count(*)::int AS c FROM pg_indexes WHERE schemaname = 'public'",
)
console.log(`indexes: ${indexes.rows[0].c}`)

const fks = await query(`
  SELECT count(*)::int AS c FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
`)
console.log(`foreign keys: ${fks.rows[0].c}`)

const checks = await query(`
  SELECT count(*)::int AS c FROM pg_constraint
  WHERE contype = 'c' AND connamespace = 'public'::regnamespace
`)
console.log(`check constraints: ${checks.rows[0].c}`)

const applied = await query('SELECT filename FROM schema_migrations ORDER BY filename')
console.log(`migrations: ${applied.rows.map((r) => r.filename).join(', ')}`)

await closePool()
