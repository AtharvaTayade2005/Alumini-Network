import { asyncHandler } from '../middleware/errorHandler.js'
import { query } from '../config/database.js'
import config from '../config/env.js'
import { serviceUnavailable } from '../utils/errors.js'

/**
 * Readiness probe: unlike a pure liveness check this actually touches the
 * database, so orchestrators only route traffic once the API can serve it.
 */
export const health = asyncHandler(async (req, res) => {
  const checks = { database: 'connected' }
  let degraded = false

  try {
    await query('SELECT 1')
  } catch {
    checks.database = 'disconnected'
    degraded = true
  }

  if (degraded) {
    throw serviceUnavailable('Service is not ready', { checks })
  }

  res.status(200).json({
    status: 'ok',
    service: 'Alumni Network Portal API',
    environment: config.env,
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  })
})

export default { health }
