import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..', '..')

dotenv.config({ path: path.join(projectRoot, '.env') })

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: process.env.DB_SSL === 'true',
}

export default config
