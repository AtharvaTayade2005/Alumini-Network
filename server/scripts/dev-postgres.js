/**
 * Zero-install local PostgreSQL for development and CI.
 *
 * Runs PGlite (PostgreSQL compiled to WebAssembly) behind the standard
 * PostgreSQL wire protocol, so the `pg` driver, migrations and application
 * code connect exactly as they would to a normal PostgreSQL server.
 *
 * Use this when Docker or a system PostgreSQL install is unavailable.
 * For production and for full-fidelity testing, run a real PostgreSQL 16 and
 * point DATABASE_URL at it; nothing in the application depends on this script.
 *
 *   node scripts/dev-postgres.js
 *   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const port = Number.parseInt(process.env.DEV_PG_PORT ?? '54329', 10)
const dataDir = process.env.DEV_PG_DATA_DIR ?? path.join(rootDir, '.dev-postgres')

const db = await PGlite.create({ dataDir })

const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
await server.start()

process.stdout.write(
  `dev postgres listening on 127.0.0.1:${port}\n`
  + `data directory: ${dataDir}\n`
  + `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${port}/postgres\n`,
)

const stop = async () => {
  await server.stop()
  await db.close()
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
