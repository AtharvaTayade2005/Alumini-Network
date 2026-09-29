import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import config from '../config/env.js'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, config.security.bcryptRounds)
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

export function generateReceiptNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `DN-${stamp}-${rand}`
}

export function generateIdempotencyKey() {
  return crypto.randomUUID()
}

export function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
