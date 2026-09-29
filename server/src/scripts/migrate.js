import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, query, closePool } from '../config/database.js'

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'database',
  'migrations',
)

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function appliedFiles() {
  const { rows } = await query('SELECT filename FROM schema_migrations')
  return new Set(rows.map((r) => r.filename))
}

async function run({ up = true } = {}) {
  await ensureMigrationsTable()
  const done = await appliedFiles()

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const pending = files.filter((f) => !done.has(f))
  if (!up) return { applied: [], skipped: pending }

  const applied = []
  for (const file of pending) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      applied.push(file)
      console.log(`applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`failed ${file}: ${error.message}`)
      throw error
    } finally {
      client.release()
    }
  }

  if (applied.length === 0) console.log('database already up to date')
  return { applied, skipped: [] }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  try {
    const result = await run()
    console.log(`migrations complete (${result.applied.length} applied)`)
  } catch {
    process.exitCode = 1
  } finally {
    await closePool()
  }
}

export default run
