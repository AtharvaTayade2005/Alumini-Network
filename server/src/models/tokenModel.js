import { query, withTransaction } from '../config/database.js'
import { generateToken, hashToken } from '../utils/crypto.js'
import config from '../config/env.js'

export async function createRefreshToken({ userId, token, userAgent, ip }) {
  const expiresAt = new Date(
    Date.now() + parseDurationMs(config.jwt.refreshExpiresIn),
  )
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), expiresAt, userAgent ?? null, ip ?? null],
  )
  return expiresAt
}

export async function findRefreshToken(token) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashToken(token)],
  )
  return rows[0] ?? null
}

export async function rotateRefreshToken(oldToken, { userId, token }) {
  const expiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiresIn))
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [hashToken(oldToken)],
    )
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt],
    )
  })
  return expiresAt
}

export async function revokeRefreshToken(token) {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
    [hashToken(token)],
  )
}

export async function revokeAllForUser(userId) {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  )
}

export async function purgeExpired() {
  const { rowCount } = await query(
    "DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days'",
  )
  return rowCount
}

function parseDurationMs(value) {
  const match = /^(\d+)([smhd])$/.exec(String(value))
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const amount = Number(match[1])
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]]
  return amount * unit
}

export { generateToken, hashToken }
