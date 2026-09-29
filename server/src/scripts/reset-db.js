import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../config/env.js'
import { pool, closePool } from '../config/database.js'
import logger from '../utils/logger.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationDir = path.resolve(here, '..', '..', '..', 'database', 'migrations')

/**
 * Runs raw multi-statement SQL. pg's simple query protocol accepts a whole
 * script, which the extended protocol used by pool.query() does not.
 */
function runScript(sql) {
  return new Promise((resolve, reject) => {
    const client = pool.connect()
    client.then((c) => {
      c.query(sql, (err) => {
        c.release()
        if (err) reject(err)
        else resolve()
      })
    }, reject)
  })
}

/**
 * Drops and recreates the public schema, then replays every migration and seed
 * from scratch. This is a destructive development convenience only; it refuses
 * to run against a production database.
 */
async function run() {
  if (config.isProduction) {
    throw new Error('db:reset refuses to run with NODE_ENV=production')
  }

  await runScript('DROP SCHEMA public CASCADE')
  await runScript('CREATE SCHEMA public')
  logger.warn('public schema dropped and recreated')

  await runScript(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const files = (await fs.readdir(migrationDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationDir, file), 'utf8')
    try {
      await runScript(sql)
    } catch (error) {
      throw new Error(`migration ${file} failed: ${error.message}`)
    }
    const client = await pool.connect()
    try {
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)', [file],
      )
    } finally {
      client.release()
    }
    logger.info('migration applied', { file })
  }

  const seedDir = path.resolve(migrationDir, '..', 'seeds')
  const seeds = (await fs.readdir(seedDir)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of seeds) {
    const sql = await fs.readFile(path.join(seedDir, file), 'utf8')
    await runScript(sql)
    logger.info('seed applied', { file })
  }

  logger.info('reset complete', { migrations: files.length, seeds: seeds.length })
}

run()
  .then(() => closePool())
  .catch(async (error) => {
    logger.error('reset failed', { error: error.message })
    await closePool()
    process.exit(1)
  })
