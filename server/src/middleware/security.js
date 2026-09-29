import crypto from 'node:crypto'
import config from '../config/env.js'
import { query } from '../config/database.js'
import { forbidden } from '../utils/errors.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Double-submit CSRF protection for cookie-authenticated state changes.
 * Access tokens travel in the Authorization header, so a cross-site form
 * post cannot attach one; this guards any browser-managed credential.
 */
export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const usesCookieAuth = req.cookies?.refresh_token
  if (!usesCookieAuth) return next()

  const token = req.get('x-csrf-token')
  const expected = req.cookies.csrf_token

  if (!token || !expected) {
    return next(forbidden('CSRF token missing'))
  }
  const a = Buffer.from(String(token))
  const b = Buffer.from(String(expected))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(forbidden('CSRF token invalid'))
  }
  return next()
}

export function setSecurityHeaders(_req, res, next) {
  res.setHeader('X-Request-Id', crypto.randomUUID())
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()')
  res.setHeader(
    'Content-Security-Policy',
    config.isProduction
      ? "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'",
  )
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

export async function attachRequestId(req, res, next) {
  req.id = req.get('x-request-id') || crypto.randomUUID()
  res.locals.requestId = req.id
  next()
}

export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    // Structured one-line access log; body content is never logged.
    import('../utils/logger.js').then(({ default: logger }) => {
      logger[level]('request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: req.user?.id,
        requestId: req.id,
      })
    })
  })
  next()
}

export async function assertDatabaseAvailable(_req, _res, next) {
  try {
    await query('SELECT 1')
    next()
  } catch {
    next(Object.assign(new Error('Database unavailable'), { statusCode: 503 }))
  }
}
