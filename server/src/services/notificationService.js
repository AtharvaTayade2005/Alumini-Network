import { query } from '../config/database.js'
import * as mailService from './mailService.js'
import { getRealtime } from '../sockets/index.js'

const EMAIL_TEMPLATES = {
  mentorship_request: 'mentorship_request',
  mentorship_accepted: 'mentorship_accepted',
  connection_request: 'connection_request',
  event_rsvp: 'event_rsvp',
  event_reminder: 'event_reminder',
  event_cancelled: 'event_cancelled',
  job_application_update: 'job_application_update',
  donation_confirmation: 'donation_receipt',
  verification_result: 'email_verification',
  admin_notice: 'email_verification',
}

export async function notify({
  userId, type, title, body = null, link = null, actorId = null, email = null,
}) {
  if (!userId) return null

  const { rows: prefRows } = await query(
    'SELECT * FROM notification_preferences WHERE user_id = $1', [userId],
  )
  const pref = prefRows[0]

  if (!pref || pref.in_app_enabled) {
    if (!pref?.muted_types?.includes(type)) {
      const { rows } = await query(
        `INSERT INTO notifications (user_id, type, title, body, link, actor_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [userId, type, title, body, link, actorId],
      )
      getRealtime()?.toUser(userId).emit('notification', formatNotification(rows[0]))
    }
  }

  if (email && pref?.email_enabled && !pref?.muted_types?.includes(type)) {
    const template = EMAIL_TEMPLATES[type]
    if (template) {
      await mailService.queueEmail(email, title, template, { ...email, name: email })
    }
  }

  return true
}

export function formatNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    actorId: row.actor_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export async function list(userId, { limit = 20, offset = 0, unreadOnly = false, type }) {
  const conditions = ['user_id = $1']
  const params = [userId]

  if (unreadOnly) conditions.push('is_read = FALSE')
  if (type) {
    params.push(type)
    conditions.push(`type = $${params.length}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows } = await query(
    `SELECT * FROM notifications ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT is_read)::int AS unread
     FROM notifications ${where}`,
    params,
  )

  return {
    rows: rows.map(formatNotification),
    total: countRows[0].total,
    unread: countRows[0].unread,
  }
}

export async function unreadCount(userId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND NOT is_read',
    [userId],
  )
  return rows[0].c
}

export async function markRead(userId, notificationId) {
  const { rowCount } = await query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
    [notificationId, userId],
  )
  return rowCount > 0
}

export async function markAllRead(userId) {
  const { rowCount } = await query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND NOT is_read',
    [userId],
  )
  return rowCount
}

export async function remove(userId, notificationId) {
  const { rowCount } = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId],
  )
  return rowCount > 0
}

export async function getPreferences(userId) {
  const { rows } = await query(
    `INSERT INTO notification_preferences (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId],
  )
  return rows[0]
}

export async function updatePreferences(userId, data) {
  await getPreferences(userId)
  const { rows } = await query(
    `UPDATE notification_preferences SET
       email_enabled = COALESCE($2, email_enabled),
       in_app_enabled = COALESCE($3, in_app_enabled),
       muted_types = COALESCE($4, muted_types)
     WHERE user_id = $1 RETURNING *`,
    [userId, data.emailEnabled ?? null, data.inAppEnabled ?? null,
      data.mutedTypes ?? null],
  )
  return rows[0]
}
