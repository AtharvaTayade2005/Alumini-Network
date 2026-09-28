import { Pool } from 'pg'
import config from '../config/env.js'

export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    })
  : null

export async function checkDatabaseConnection() {
  if (!pool) return false
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export default pool
