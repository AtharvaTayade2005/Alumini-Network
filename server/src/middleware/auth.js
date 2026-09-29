import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import { query } from '../config/database.js'
import { unauthorized, forbidden } from '../utils/errors.js'
import { hashToken } from '../utils/crypto.js'

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, type: 'access' },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpiresIn,
      issuer: config.jwt.issuer,
    },
  )
}

export function signRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user.id, jti: tokenId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn, issuer: config.jwt.issuer },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: config.jwt.issuer })
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, { issuer: config.jwt.issuer })
}

const USER_STATE_SQL = `
  SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url,
         u.is_email_verified, u.is_active, u.is_suspended,
         u.phone, u.failed_login_count,
         COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.id = $1
  GROUP BY u.id
`

export async function loadUser(userId) {
  const { rows } = await query(USER_STATE_SQL, [userId])
  return rows[0] ?? null
}

function extractToken(req) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

export async function authenticate(req, _res, next) {
  try {
    const token = extractToken(req)
    if (!token) throw unauthorized('Authentication token is missing')

    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') throw unauthorized('Invalid token type')

    const user = await loadUser(payload.sub)
    if (!user) throw unauthorized('Account no longer exists')
    if (user.is_suspended) throw forbidden('This account has been suspended')
    if (!user.is_active) throw forbidden('This account has been deactivated')

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token
      ?? socket.handshake.headers?.authorization?.replace('Bearer ', '')
    if (!token) return next(new Error('UNAUTHENTICATED'))

    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') return next(new Error('INVALID_TOKEN'))

    const user = await loadUser(payload.sub)
    if (!user) return next(new Error('UNAUTHENTICATED'))
    if (user.is_suspended || !user.is_active) return next(new Error('ACCOUNT_DISABLED'))

    socket.user = user
    return next()
  } catch {
    return next(new Error('UNAUTHENTICATED'))
  }
}

export { hashToken }
