import { query } from '../config/database.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js'
import * as notificationService from './notificationService.js'
import * as userModel from '../models/userModel.js'
import * as profileModel from '../models/profileModel.js'

export async function getRequestState(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) return 'self'

  const { rows } = await query(
    `SELECT * FROM connections
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [currentUserId, targetUserId],
  )
  const connection = rows[0]
  if (!connection) return 'none'
  if (connection.status === 'blocked') return 'blocked'
  if (connection.status === 'accepted') return 'connected'
  if (connection.status === 'rejected') return 'none'
  return connection.requester_id === currentUserId ? 'pending_outgoing' : 'pending_incoming'
}

export async function sendRequest({ requesterId, addresseeId, message }) {
  if (requesterId === addresseeId) throw badRequest('You cannot connect with yourself')

  const addressee = await userModel.findById(addresseeId)
  if (!addressee) throw notFound('User')
  if (!addressee.is_active || addressee.is_suspended) {
    throw badRequest('That account is not available for connections')
  }

  const privacy = await profileModel.getPrivacySettings(addresseeId)
  if (privacy && !privacy.allow_connection_requests) {
    throw forbidden('This person is not accepting connection requests')
  }

  const state = await getRequestState(requesterId, addresseeId)
  if (state === 'connected') throw conflict('You are already connected')
  if (state === 'pending_outgoing') throw conflict('You already sent a request')
  if (state === 'pending_incoming') {
    throw conflict('This person has already sent you a request')
  }
  if (state === 'blocked') throw forbidden('Connections are not available')

  const { rows } = await query(
    `INSERT INTO connections (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending') RETURNING *`,
    [requesterId, addresseeId],
  )

  const requester = await userModel.findById(requesterId)
  await notificationService.notify({
    userId: addresseeId,
    actorId: requesterId,
    type: 'connection_request',
    title: 'New connection request',
    body: message
      ? `${requester.first_name} ${requester.last_name}: ${message.slice(0, 180)}`
      : `${requester.first_name} ${requester.last_name} would like to connect`,
    link: '/network/connections',
    email: addressee.email,
  })

  return formatConnection(rows[0], requesterId)
}

export async function respond({ connectionId, userId, accept }) {
  const { rows } = await query(
    'SELECT * FROM connections WHERE id = $1 FOR UPDATE', [connectionId],
  )
  const connection = rows[0]
  if (!connection) throw notFound('Connection request')
  if (connection.addressee_id !== userId) {
    throw forbidden('You can only respond to requests addressed to you')
  }
  if (connection.status !== 'pending') {
    throw badRequest('This request has already been handled')
  }

  const status = accept ? 'accepted' : 'rejected'
  const { rows: updated } = await query(
    `UPDATE connections SET status = $2, responded_at = NOW()
     WHERE id = $1 RETURNING *`,
    [connectionId, status],
  )

  if (accept) {
    const other = await userModel.findById(connection.requester_id)
    await notificationService.notify({
      userId: connection.requester_id,
      actorId: userId,
      type: 'connection_accepted',
      title: 'Connection accepted',
      body: 'Someone accepted your connection request',
      link: '/network/connections',
      email: other.email,
    })
  }

  return formatConnection(updated[0], userId)
}

export async function remove(userId, targetUserId) {
  const { rows } = await query(
    `DELETE FROM connections
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)
     RETURNING id`,
    [userId, targetUserId],
  )
  if (!rows.length) throw notFound('Connection')
  return { removed: true }
}

export async function block(userId, targetUserId) {
  if (userId === targetUserId) throw badRequest('You cannot block yourself')

  const state = await getRequestState(userId, targetUserId)
  if (state === 'blocked') return { status: 'blocked' }

  const { rows } = await query(
    `SELECT * FROM connections
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [userId, targetUserId],
  )

  if (rows[0]) {
    await query(
      `UPDATE connections
       SET status = 'blocked',
           requester_id = $1, addressee_id = $2, responded_at = NOW()
       WHERE id = $3`,
      [userId, targetUserId, rows[0].id],
    )
  } else {
    await query(
      `INSERT INTO connections (requester_id, addressee_id, status, responded_at)
       VALUES ($1, $2, 'blocked', NOW())`,
      [userId, targetUserId],
    )
  }
  return { status: 'blocked' }
}

export async function listConnections(userId, { limit = 50, offset = 0, status }) {
  const params = [userId]
  let statusClause = ''
  if (status) {
    params.push(status)
    statusClause = `AND c.status = $${params.length}`
  }
  params.push(limit, offset)

  const { rows } = await query(
    `SELECT c.*, u.id AS peer_id, u.first_name, u.last_name, u.avatar_url,
            u.is_active, u.is_suspended,
            COALESCE(ap.current_company, sp.degree) AS headline_company,
            ap.current_position,
            ap.graduation_year, ap.degree AS alumni_degree,
            sp.degree AS student_degree, sp.year_of_study
     FROM connections c
     JOIN users u ON u.id = CASE WHEN c.requester_id = $1
                                 THEN c.addressee_id ELSE c.requester_id END
     LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE (c.requester_id = $1 OR c.addressee_id = $1) ${statusClause}
     ORDER BY COALESCE(c.responded_at, c.created_at) DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  const { rows: counts } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
       COUNT(*) FILTER (WHERE status = 'pending' AND addressee_id = $1)::int AS incoming,
       COUNT(*) FILTER (WHERE status = 'pending' AND requester_id = $1)::int AS outgoing
     FROM connections WHERE requester_id = $1 OR addressee_id = $1`,
    [userId],
  )

  return {
    rows: rows.map((r) => formatConnection(r, userId)),
    counts: counts[0],
  }
}

export async function listPending(userId, { limit = 50, offset = 0 }) {
  const { rows } = await query(
    `SELECT c.*, u.id AS peer_id, u.first_name, u.last_name, u.avatar_url,
            ap.current_company, ap.current_position, ap.graduation_year
     FROM connections c
     JOIN users u ON u.id = c.requester_id
     LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
     WHERE c.addressee_id = $1 AND c.status = 'pending'
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  return rows.map((r) => formatConnection(r, userId))
}

export async function getMutuals(userId, otherUserId) {
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.avatar_url, ap.current_company
     FROM connections c1
     JOIN connections c2
       ON (CASE WHEN c1.requester_id = $1 THEN c1.addressee_id ELSE c1.requester_id END)
        = (CASE WHEN c2.requester_id = $3 THEN c2.addressee_id ELSE c2.requester_id END)
     JOIN users u ON u.id = (CASE WHEN c1.requester_id = $2
                                THEN c1.addressee_id ELSE c1.requester_id END)
     LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
     WHERE c1.status = 'accepted'
       AND (c1.requester_id = $1 OR c1.addressee_id = $1)
       AND c2.status = 'accepted'
       AND (c2.requester_id = $3 OR c2.addressee_id = $3)
     LIMIT 50`,
    [userId, otherUserId, otherUserId],
  )
  return rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    avatarUrl: r.avatar_url,
    currentCompany: r.current_company,
  }))
}

export function formatConnection(row, viewerId) {
  const incoming = row.requester_id !== viewerId
  return {
    id: row.id,
    status: row.status,
    direction: incoming ? 'incoming' : 'outgoing',
    peer: row.peer_id ? {
      id: row.peer_id,
      name: `${row.first_name} ${row.last_name}`,
      avatarUrl: row.avatar_url,
      currentCompany: row.current_company ?? null,
      currentPosition: row.current_position ?? null,
      graduationYear: row.graduation_year ?? null,
      degree: row.alumni_degree ?? row.student_degree ?? null,
      yearOfStudy: row.year_of_study ?? null,
      headline: row.headline_company ?? null,
    } : undefined,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }
}

export async function getStats(userId) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'accepted')::int AS connections,
       COUNT(*) FILTER (WHERE status = 'pending' AND addressee_id = $1)::int AS pending_received,
       COUNT(*) FILTER (WHERE status = 'pending' AND requester_id = $1)::int AS     pending_sent
     FROM connections WHERE requester_id = $1 OR addressee_id = $1`,
    [userId],
  )
  return rows[0]
}
