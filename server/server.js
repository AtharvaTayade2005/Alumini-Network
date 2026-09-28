import app from './src/app.js'
import config from './src/config/env.js'
import pool from './src/config/database.js'

const server = app.listen(config.port, () => {
  console.log(`Alumni Network Portal API listening on port ${config.port}`)
})

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`)
  server.close(async () => {
    if (pool) await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
