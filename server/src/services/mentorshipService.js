import { query, withTransaction } from '../config/database.js'
import * as mentorshipModel from '../models/mentorshipModel.js'
import * as connectionService from './connectionService.js'
import * as notificationService from './notificationService.js'
import * as auditService from './auditService.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js'

/**
 * A mentorship is only offered by an alumni account that has opted in and been
 * verified, and only to members who are not already connected in a way that
 * would make the pairing redundant.
 */
async function assertEligibleMentor(mentorId, menteeId) {
  if (mentorId === menteeId) {
    throw badRequest('You cannot request mentorship from yourself')
  }

  const { rows } = await query(
    `SELECT u.is_active, u.is_suspended,
            ap.is_open_to_mentor, ap.mentorship_capacity, ap.verification_status
     FROM users u
     LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [mentorId],
  )
  const mentor = rows[0]
  if (!mentor) throw notFound('Mentor')
  if (!mentor.is_active || mentor.is_suspended) {
    throw badRequest('That account is not available for mentorship')
  }
  if (!mentor.is_open_to_mentor) {
    throw badRequest('That member is not accepting mentorship requests right now')
  }
  if (mentor.verification_status !== 'verified') {
    throw badRequest('That member is awaiting alumni verification')
  }

  const active = await mentorshipModel.countActiveMentorships(mentorId)
  if (active >= (mentor.mentorship_capacity ?? 1)) {
    throw badRequest('That mentor is already at capacity')
  }
  return mentor
}

export async function requestMentorship(menteeId, payload, context = {}) {
  const { mentorId, careerGoal, areaOfInterest, message, preferredMode } = payload
  if (mentorId === menteeId) {
    throw badRequest('You cannot request mentorship from yourself')
  }

  // The pair state is checked before eligibility: a mentor who is already full
  // because of *this* mentee should be told about the existing mentorship, not
  // about capacity.
  const existing = await mentorshipModel.findPairRequest(mentorId, menteeId)
  if (existing?.status === 'pending') {
    throw conflict('A mentorship request is already pending for this pair')
  }
  if (existing?.status === 'accepted') {
    throw conflict('You already have an active mentorship with this member')
  }

  await assertEligibleMentor(mentorId, menteeId)

  // Mentorship is meant to build on a real relationship, so a merely pending
  // connection request is not enough.
  const connectionState = await connectionService.getRequestState(menteeId, mentorId)
  if (connectionState === 'blocked') {
    throw forbidden('This member is not available for mentorship')
  }
  if (connectionState !== 'connected') {
    throw badRequest('Connect with this member before requesting mentorship')
  }

  const created = await mentorshipModel.createRequest({
    mentorId, menteeId, careerGoal, areaOfInterest, message, preferredMode,
  })
  // A concurrent request can win the race against our status check; the
  // ON CONFLICT guard then matches nothing and returns no row.
  if (!created) throw conflict('A mentorship request already exists for this pair')

  await notificationService.notify({
    userId: mentorId,
    type: 'mentorship_request',
    title: 'New mentorship request',
    body: `${areaOfInterest} - a member is asking for guidance.`,
    link: '/mentorship',
    actorId: menteeId,
  })

  await auditService.record({
    actorId: menteeId,
    action: 'mentorship.requested',
    entityType: 'mentorship_request',
    entityId: created.id,
    metadata: { mentorId },
    context,
  })

  return mentorshipModel.formatRequest(
    await mentorshipModel.findRequestWithPeer(created.id, menteeId), menteeId,
  )
}

export async function respondToRequest(mentorId, requestId, payload, context = {}) {
  const request = await mentorshipModel.findRequestById(requestId)
  if (!request) throw notFound('Mentorship request')
  if (request.mentor_id !== mentorId) {
    throw forbidden('Only the requested mentor can respond to this request')
  }
  if (request.status !== 'pending') {
    throw conflict('This request has already been answered')
  }

  // Accepting changes two rows that must agree with each other, and the mentor
  // may have filled up since the request was made, so both happen under one
  // transaction with the mentor's row locked.
  const relationship = await withTransaction(async (db) => {
    if (payload.status === 'accepted') {
      await mentorshipModel.assertCapacityWithLock(request.mentor_id, request.mentee_id, db)
    }
    const row = await mentorshipModel.updateRequestStatus(requestId, {
      status: payload.status,
      responseNote: payload.responseNote,
    }, db)
    if (!row) throw notFound('Mentorship request')

    return payload.status === 'accepted'
      ? mentorshipModel.createRelationship({
        requestId,
        mentorId: request.mentor_id,
        menteeId: request.mentee_id,
      }, db)
      : null
  })

  // Notifications and the audit entry are written after the commit, so a
  // rolled-back acceptance never leaves a misleading record behind.
  if (payload.status === 'accepted') {
    await notificationService.notify({
      userId: request.mentee_id,
      type: 'mentorship_accepted',
      title: 'Mentorship request accepted',
      body: 'Your mentor accepted. Open Mentorship to start in touch.',
      link: '/mentorship',
      actorId: mentorId,
    })
  } else {
    await notificationService.notify({
      userId: request.mentee_id,
      type: 'mentorship_declined',
      title: 'Mentorship request declined',
      body: payload.responseNote || 'The mentor was not available at this time.',
      link: '/mentorship',
      actorId: mentorId,
    })
  }

  await auditService.record({
    actorId: mentorId,
    action: `mentorship.${payload.status}`,
    entityType: 'mentorship_request',
    entityId: requestId,
    metadata: { menteeId: request.mentee_id },
    context,
  })

  return {
    request: mentorshipModel.formatRequest(
      await mentorshipModel.findRequestWithPeer(requestId, mentorId), mentorId,
    ),
    relationship: relationship
      ? mentorshipModel.formatRelationship(
        await mentorshipModel.findRelationshipWithPeer(relationship.id, mentorId), mentorId,
      )
      : null,
  }
}

export async function cancelMyRequest(userId, requestId, context = {}) {
  const request = await mentorshipModel.findRequestById(requestId)
  if (!request) throw notFound('Mentorship request')
  if (request.mentee_id !== userId) {
    throw forbidden('Only the mentee can cancel this request')
  }
  if (request.status !== 'pending') {
    throw conflict('Only a pending request can be cancelled')
  }

  const cancelled = await mentorshipModel.cancelRequest(requestId)
  if (!cancelled) throw notFound('Mentorship request')
  await auditService.record({
    actorId: userId,
    action: 'mentorship.cancelled',
    entityType: 'mentorship_request',
    entityId: requestId,
    context,
  })
  return mentorshipModel.formatRequest(
    await mentorshipModel.findRequestWithPeer(requestId, userId), userId,
  )
}

export async function listRequests(userId, { limit = 20, offset = 0, status, role }) {
  const conditions = ['(r.mentor_id = $1 OR r.mentee_id = $1)']
  const params = [userId]

  if (status) {
    params.push(status)
    conditions.push(`r.status = $${params.length}`)
  }
  if (role === 'mentor') conditions.push('r.mentor_id = $1')
  if (role === 'mentee') conditions.push('r.mentee_id = $1')

  const where = `WHERE ${conditions.join(' AND ')}`
  const rows = await mentorshipModel.listRequestsWithPeer(userId, {
    limit, offset, where, params,
  })

  const { rows: counts } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted
     FROM mentorship_requests WHERE mentor_id = $1 OR mentee_id = $1`,
    [userId],
  )

  return { rows: rows.map((r) => mentorshipModel.formatRequest(r, userId)), counts: counts[0] }
}

export async function listMentorships(userId, { status, limit = 50, offset = 0 }) {
  const conditions = ['(rel.mentor_id = $1 OR rel.mentee_id = $1)']
  const params = [userId]
  if (status) {
    params.push(status)
    conditions.push(`rel.status = $${params.length}`)
  }

  const { rows } = await query(
    `SELECT rel.*,
            CASE WHEN rel.mentor_id = $1 THEN rel.mentee_id ELSE rel.mentor_id END AS peer_id,
            u.first_name || ' ' || u.last_name AS peer_name, u.avatar_url AS peer_avatar_url,
            ap.current_company AS peer_company, ap.current_position AS peer_position
     FROM mentorship_relationships rel
     JOIN users u ON u.id = CASE WHEN rel.mentor_id = $1 THEN rel.mentee_id ELSE rel.mentor_id END
     LEFT JOIN alumni_profiles ap
       ON ap.user_id = CASE WHEN rel.mentor_id = $1 THEN rel.mentee_id ELSE rel.mentor_id END
     WHERE ${conditions.join(' AND ')}
     ORDER BY rel.started_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )
  return rows.map((r) => mentorshipModel.formatRelationship(r, userId))
}

export async function endMentorship(userId, relationshipId, payload, context = {}) {
  const relationship = await mentorshipModel.findRelationshipById(relationshipId)
  if (!relationship) throw notFound('Mentorship')
  if (relationship.mentor_id !== userId && relationship.mentee_id !== userId) {
    throw forbidden('You are not part of this mentorship')
  }
  if (relationship.status !== 'active') {
    throw conflict('This mentorship has already ended')
  }

  const updated = await mentorshipModel.endRelationship(relationshipId, {
    endedBy: userId,
    endReason: payload.endReason,
  })
  const peerId = relationship.mentor_id === userId
    ? relationship.mentee_id : relationship.mentor_id

  await notificationService.notify({
    userId: peerId,
    type: 'mentorship_ended',
    title: 'Mentorship ended',
    body: payload.endReason || 'A mentorship has been closed by one of the participants.',
    link: '/mentorship',
    actorId: userId,
  })
  await auditService.record({
    actorId: userId,
    action: 'mentorship.ended',
    entityType: 'mentorship_relationship',
    entityId: relationshipId,
    context,
  })

  return mentorshipModel.formatRelationship(updated, userId)
}

export async function completeMentorship(userId, relationshipId, context = {}) {
  const relationship = await mentorshipModel.findRelationshipById(relationshipId)
  if (!relationship) throw notFound('Mentorship')
  if (relationship.mentor_id !== userId && relationship.mentee_id !== userId) {
    throw forbidden('You are not part of this mentorship')
  }
  if (relationship.status !== 'active') {
    throw conflict('Only an active mentorship can be completed')
  }
  const updated = await mentorshipModel.completeRelationship(relationshipId)
  await auditService.record({
    actorId: userId,
    action: 'mentorship.completed',
    entityType: 'mentorship_relationship',
    entityId: relationshipId,
    context,
  })
  return mentorshipModel.formatRelationship(updated, userId)
}

/** Alumni who have opted in and still have capacity, for the discovery screen. */
export async function findAvailableMentors(viewerId, { search, industry, limit = 20, offset = 0 }) {
  const conditions = [
    'u.id <> $1',
    'u.is_active',
    'NOT u.is_suspended',
    'ap.is_open_to_mentor = TRUE',
    'ap.verification_status = \'verified\'',
  ]
  const params = [viewerId]

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(u.first_name || ' ' || u.last_name ILIKE $${params.length}
                     OR ap.current_company ILIKE $${params.length}
                     OR ap.industry ILIKE $${params.length})`)
  }
  if (industry) {
    params.push(industry)
    conditions.push(`ap.industry = $${params.length}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const { rows } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
            ap.current_company, ap.current_position, ap.industry, ap.degree,
            ap.graduation_year, ap.bio, ap.mentorship_capacity,
            (SELECT COUNT(*)::int FROM mentorship_relationships r
              WHERE r.mentor_id = u.id AND r.status = 'active') AS active_count
     FROM users u
     JOIN alumni_profiles ap ON ap.user_id = u.id
     ${where}
     ORDER BY active_count ASC, ap.graduation_year DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )

  const { rows: counts } = await query(
    `SELECT COUNT(*)::int AS c FROM users u
     JOIN alumni_profiles ap ON ap.user_id = u.id ${where}`,
    params,
  )

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      avatarUrl: r.avatar_url,
      currentCompany: r.current_company,
      currentPosition: r.current_position,
      industry: r.industry,
      degree: r.degree,
      graduationYear: r.graduation_year,
      bio: r.bio,
      openSlots: Math.max(0, (r.mentorship_capacity ?? 1) - r.active_count),
    })),
    total: counts[0].c,
  }
}
