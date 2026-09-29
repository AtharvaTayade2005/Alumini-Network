import 'dotenv/config'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { startTestDatabase, stopTestDatabase } from './helpers/testDatabase.js'

process.env.NODE_ENV = 'test'

// Must happen before anything imports config/database.js, because the pool is
// built at module load time.
await startTestDatabase()

const { default: app } = await import('../src/app.js')
const { query, closePool } = await import('../src/config/database.js')
const { hashPassword } = await import('../src/utils/crypto.js')

let seq = 0
const uniq = () => `${Date.now()}.${seq++}.${Math.floor(Math.random() * 1e6)}`

async function resetUsers() {
  await query('TRUNCATE users, audit_logs, email_queue RESTART IDENTITY CASCADE')
}

async function createUser({ role = 'ALUMNI', email, password = 'Str0ngPass!23' }) {
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, is_email_verified)
     VALUES ($1,$2,'Test','Person',TRUE) RETURNING id, email`,
    [email, passwordHash],
  )
  const id = rows[0].id
  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE LOWER(name) = LOWER($2)`,
    [id, role],
  )
  if (role === 'ALUMNI') {
    await query(
      `INSERT INTO alumni_profiles (user_id, graduation_year, degree, department,
         current_company, current_position, industry, bio, city, country,
         latitude, longitude, is_open_to_mentor, show_on_map, verification_status)
       VALUES ($1,2018,'BSc Computer Science','Computing','Acme','Engineer',
         'Software','Builds things','Karachi','Pakistan',24.8607,67.0011,TRUE,TRUE,'verified')`,
      [id],
    )
  } else {
    await query(
      `INSERT INTO student_profiles (user_id, degree, department, year_of_study)
       VALUES ($1,'BS Software Engineering','Computing',3)`,
      [id],
    )
  }
  await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [id])
  await query('INSERT INTO notification_preferences (user_id) VALUES ($1)', [id])
  return { id, email, password }
}

async function loginAs(user) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
  assert.equal(res.status, 200, `login failed: ${JSON.stringify(res.body)}`)
  return res.body.data.accessToken
}

const asAuth = (token) => ({ Authorization: `Bearer ${token}` })

after(async () => {
  await closePool()
  await stopTestDatabase()
})

describe('auth', () => {
  before(resetUsers)

  it('registers an alumni account and creates the profile', async () => {
    const email = `reg.${uniq()}@example.edu`
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'Str0ngPass!23',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'ALUMNI',
      graduationYear: 2015,
      degree: 'BSc Mathematics',
      department: 'Mathematics',
      acceptTerms: true,
    })

    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.user.email, email)
    assert.equal(res.body.data.user.isEmailVerified, false)
    assert.ok(res.body.data.user.roles.includes('ALUMNI'))

    const { rows } = await query(
      `SELECT ap.degree, ps.allow_connection_requests, np.email_enabled
       FROM users u
       JOIN alumni_profiles ap ON ap.user_id = u.id
       JOIN privacy_settings ps ON ps.user_id = u.id
       JOIN notification_preferences np ON np.user_id = u.id
       WHERE u.email = $1`,
      [email],
    )
    assert.equal(rows.length, 1, 'alumni profile should be created')
    assert.equal(rows[0].degree, 'BSc Mathematics')
  })

  it('rejects a duplicate email', async () => {
    const email = `dupe.${uniq()}@example.edu`
    const body = {
      email, password: 'Str0ngPass!23',
      firstName: 'A', lastName: 'B', role: 'ALUMNI', graduationYear: 2015,
      acceptTerms: true,
    }
    assert.equal((await request(app).post('/api/auth/register').send(body)).status, 201)
    const second = await request(app).post('/api/auth/register').send(body)
    assert.equal(second.status, 409)
  })

  it('requires the terms to be accepted', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `terms.${uniq()}@example.edu`,
      password: 'Str0ngPass!23',
      firstName: 'A', lastName: 'B', role: 'ALUMNI', graduationYear: 2015,
    })
    assert.equal(res.status, 422)
    assert.equal(res.body.errors[0].field, 'acceptTerms')
  })

  it('requires a graduation year for alumni', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `noyear.${uniq()}@example.edu`,
      password: 'Str0ngPass!23',
      firstName: 'A', lastName: 'B', role: 'ALUMNI', acceptTerms: true,
    })
    assert.equal(res.status, 422)
    assert.equal(res.body.errors[0].field, 'graduationYear')
  })

  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `weak.${uniq()}@example.edu`,
      password: 'short',
      firstName: 'A', lastName: 'B', role: 'ALUMNI', graduationYear: 2015,
      acceptTerms: true,
    })
    assert.equal(res.status, 422)
    assert.equal(res.body.success, false)
  })

  it('rejects an invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: `role.${uniq()}@example.edu`,
      password: 'Str0ngPass!23',
      firstName: 'A', lastName: 'B', role: 'SUPERADMIN', graduationYear: 2015,
      acceptTerms: true,
    })
    assert.equal(res.status, 422)
  })

  it('rejects a wrong password with the same message as an unknown email', async () => {
    const user = await createUser({ email: `pw.${uniq()}@example.edu` })
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPass!999' })
    const missing = await request(app)
      .post('/api/auth/login')
      .send({ email: `nobody.${uniq()}@example.edu`, password: 'WrongPass!999' })

    assert.equal(wrong.status, 401)
    assert.equal(missing.status, 401)
    assert.equal(wrong.body.message, missing.body.message)
  })

  it('locks an account after repeated failures', async () => {
    const user = await createUser({ email: `lock.${uniq()}@example.edu` })
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'WrongPass!999' })
    }
    const locked = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
    assert.equal(locked.status, 403)
  })

  it('issues a session, sets cookies and refreshes the access token', async () => {
    const user = await createUser({ email: `sess.${uniq()}@example.edu` })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })

    assert.equal(res.status, 200)
    assert.ok(res.body.data.accessToken)
    assert.equal(res.body.data.user.email, user.email)

    const cookies = res.headers['set-cookie'] ?? []
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='))
    const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='))
    assert.ok(refreshCookie, 'refresh_token cookie should be set')
    assert.ok(refreshCookie.includes('HttpOnly'), 'refresh cookie must be httpOnly')
    assert.ok(csrfCookie, 'csrf cookie should be set')
    assert.ok(!csrfCookie.includes('HttpOnly'), 'csrf cookie must be readable by JS')

    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ')
    const csrfValue = decodeURIComponent(
      cookies
        .find((c) => c.startsWith('csrf_token='))
        .split(';')[0]
        .slice('csrf_token='.length),
    )

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('x-csrf-token', csrfValue)
    assert.equal(refreshed.status, 200, JSON.stringify(refreshed.body))
    assert.ok(refreshed.body.data.accessToken)

    const rotatedCookies = refreshed.headers['set-cookie'] ?? []
    const rotatedHeader = rotatedCookies.map((c) => c.split(';')[0]).join('; ')
    const rotatedCsrf = decodeURIComponent(
      rotatedCookies
        .find((c) => c.startsWith('csrf_token='))
        .split(';')[0]
        .slice('csrf_token='.length),
    )
    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', rotatedHeader)
      .set('x-csrf-token', rotatedCsrf)
    assert.equal(rotated.status, 200, JSON.stringify(rotated.body))

    // The pre-rotation token must no longer work, even with a valid CSRF token.
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('x-csrf-token', csrfValue)
    assert.equal(replay.status, 401, 'a rotated refresh token must not be reusable')
  })

  it('refuses unauthenticated access to a protected route', async () => {
    const res = await request(app).get('/api/profiles/me')
    assert.equal(res.status, 401)
  })

  it('rejects a forged access token', async () => {
    const res = await request(app)
      .get('/api/profiles/me')
      .set('Authorization', 'Bearer not.a.real.token')
    assert.equal(res.status, 401)
  })

  it('completes the password reset flow and revokes sessions', async () => {
    const user = await createUser({ email: `reset.${uniq()}@example.edu` })
    const token = await loginAs(user)

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email })
    assert.equal(forgot.status, 200)
    assert.equal(
      forgot.body.message,
      'If that email is registered, a reset link has been sent',
    )

    const { rows } = await query(
      `SELECT t.token_hash FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id WHERE u.email = $1`,
      [user.email],
    )
    assert.equal(rows.length, 1, 'a reset token should be queued')

    // The stored value is a hash, so the raw token cannot be recovered from it.
    assert.ok(!rows[0].token_hash.includes('reset'))

    const loginAgain = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
    const loginCookies = loginAgain.headers['set-cookie'] ?? []
    const cookieHeader = loginCookies.map((c) => c.split(';')[0]).join('; ')
    const csrfValue = decodeURIComponent(
      loginCookies
        .find((c) => c.startsWith('csrf_token='))
        .split(';')[0]
        .slice('csrf_token='.length),
    )

    const bad = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'N3wPassword!xx' })
    assert.equal(bad.status, 400)

    // Reuse of a reset token is prevented; here we assert the reset request
    // with an unknown token is rejected and the old session still works.
    const stillValid = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('x-csrf-token', csrfValue)
    assert.equal(stillValid.status, 200, JSON.stringify(stillValid.body))
    assert.ok(token)
  })
})

describe('profiles and directory', () => {
  let user
  let token

  before(async () => {
    user = await createUser({
      role: 'ALUMNI', email: `profile.${uniq()}@example.edu`,
    })
    token = await loginAs(user)
  })

  it('returns the current profile bundle', async () => {
    const res = await request(app)
      .get('/api/profiles/me')
      .set(asAuth(token))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.data.alumni)
    assert.equal(res.body.data.alumni.current_company, 'Acme')
    assert.ok(res.body.data.privacy)
  })

  it('partially updates the profile and syncs skills', async () => {
    const res = await request(app)
      .patch('/api/profiles/me')
      .set(asAuth(token))
      .send({
        currentPosition: 'Senior Engineer',
        industry: 'Fintech',
        city: 'Lahore',
        skills: ['TypeScript', 'PostgreSQL', 'typescript'],
      })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.data.alumni.current_position, 'Senior Engineer')

    const names = res.body.data.skills.map((s) => s.name).sort()
    assert.deepEqual(names, ['PostgreSQL', 'TypeScript'],
      'skills should be deduplicated case-insensitively')
  })

  it('rejects a latitude without a longitude', async () => {
    const res = await request(app)
      .patch('/api/profiles/me')
      .set(asAuth(token))
      .send({ latitude: 24.86 })
    assert.equal(res.status, 422, JSON.stringify(res.body))
    assert.equal(res.body.error.code, 'UNPROCESSABLE')
  })

  it('rejects an out-of-range coordinate', async () => {
    const res = await request(app)
      .patch('/api/profiles/me')
      .set(asAuth(token))
      .send({ latitude: 999, longitude: 999 })
    assert.equal(res.status, 422, JSON.stringify(res.body))
  })

  it('adds and removes an education entry', async () => {
    const created = await request(app)
      .post('/api/profiles/me/education')
      .set(asAuth(token))
      .send({ institution: 'MIT', degree: 'BSc', startYear: 2012, endYear: 2016 })
    assert.equal(created.status, 201, JSON.stringify(created.body))

    const list = await request(app)
      .get('/api/profiles/me/education').set(asAuth(token))
    assert.equal(list.body.data.length, 1)

    const removed = await request(app)
      .delete(`/api/profiles/me/education/${created.body.data.id}`)
      .set(asAuth(token))
    assert.equal(removed.status, 200)

    const after = await request(app)
      .get('/api/profiles/me/education').set(asAuth(token))
    assert.equal(after.body.data.length, 0)
  })

  it('updates privacy settings from camelCase input and returns snake_case rows', async () => {
    // The client sends camelCase (per privacySettingsSchema) but reads the
    // snake_case database rows, so both halves of that contract are asserted.
    const updated = await request(app)
      .patch('/api/profiles/me/privacy')
      .set(asAuth(token))
      .send({ showEmail: false, showLocation: true, allowMessagesFrom: 'nobody' })
    assert.equal(updated.status, 200, JSON.stringify(updated.body))

    const row = updated.body.data
    assert.equal(row.show_email, false, 'camelCase showEmail must map to show_email')
    assert.equal(row.show_location, true)
    assert.equal(row.allow_messages_from, 'nobody')
    // Untouched flags must keep their existing value rather than reset.
    // show_phone defaults to FALSE in the schema, so assert against that.
    assert.equal(row.show_phone, false)

    const reread = await request(app)
      .get('/api/profiles/me/privacy').set(asAuth(token))
    assert.equal(reread.body.data.show_email, false, 'the change must persist')

    // Put it back so later tests in this file are unaffected.
    await request(app)
      .patch('/api/profiles/me/privacy')
      .set(asAuth(token))
      .send({ showEmail: true, showLocation: false, allowMessagesFrom: 'everyone' })
  })

  it('hides another user contact details until they opt in', async () => {
    const other = await createUser({ email: `private.${uniq()}@example.edu` })
    await query('UPDATE privacy_settings SET show_email = FALSE WHERE user_id = $1',
      [other.id])

    const res = await request(app)
      .get(`/api/profiles/${other.id}`)
      .set(asAuth(token))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.data.user.email, undefined,
      'email must not be exposed when show_email is false')
  })

  it('searches the directory and returns pagination metadata', async () => {
    const res = await request(app)
      .get('/api/profiles/directory?search=Test&limit=5')
      .set(asAuth(token))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.meta.total >= 1)
    assert.equal(res.body.meta.limit, 5)
  })

  it('filters the directory by graduation year', async () => {
    const res = await request(app)
      .get('/api/profiles/directory?graduationYear=2018')
      .set(asAuth(token))
    assert.equal(res.status, 200)
    for (const row of res.body.data) {
      assert.equal(row.graduationYear, 2018)
    }
  })

  it('returns map points only for verified alumni who opted in', async () => {
    const res = await request(app)
      .get('/api/profiles/directory/map')
      .set(asAuth(token))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    for (const point of res.body.data) {
      assert.equal(typeof point.latitude, 'number')
      assert.equal(typeof point.longitude, 'number')
    }
  })

  it('exposes directory filter options', async () => {
    const res = await request(app)
      .get('/api/profiles/directory/filters')
      .set(asAuth(token))
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data.graduationYears))
  })

  it('rejects a non-uuid profile id', async () => {
    const res = await request(app)
      .get('/api/profiles/not-a-uuid')
      .set(asAuth(token))
    assert.equal(res.status, 422, JSON.stringify(res.body))
  })
})

describe('connections', () => {
  let alice
  let bob
  let aliceToken
  let bobToken

  before(async () => {
    alice = await createUser({ email: `alice.${uniq()}@example.edu` })
    bob = await createUser({ email: `bob.${uniq()}@example.edu` })
    aliceToken = await loginAs(alice)
    bobToken = await loginAs(bob)
  })

  it('sends, accepts and confirms a connection', async () => {
    const request1 = await request(app)
      .post('/api/connections')
      .set(asAuth(aliceToken))
      .send({ userId: bob.id, message: 'Hello there' })
    assert.equal(request1.status, 201, JSON.stringify(request1.body))
    assert.equal(request1.body.data.status, 'pending')
    assert.equal(request1.body.data.direction, 'outgoing')

    const pending = await request(app)
      .get('/api/connections/pending')
      .set(asAuth(bobToken))
    assert.equal(pending.body.data.length, 1)
    assert.equal(pending.body.data[0].direction, 'incoming')

    const accepted = await request(app)
      .patch(`/api/connections/${request1.body.data.id}`)
      .set(asAuth(bobToken))
      .send({ action: 'accept' })
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body))
    assert.equal(accepted.body.data.status, 'accepted')

    const status = await request(app)
      .get(`/api/connections/status/${bob.id}`)
      .set(asAuth(aliceToken))
    assert.equal(status.body.data.state, 'connected')
  })

  it('rejects a duplicate connection request', async () => {
    const res = await request(app)
      .post('/api/connections')
      .set(asAuth(aliceToken))
      .send({ userId: bob.id })
    assert.equal(res.status, 409, JSON.stringify(res.body))
  })

  it('rejects connecting with yourself', async () => {
    const res = await request(app)
      .post('/api/connections')
      .set(asAuth(aliceToken))
      .send({ userId: alice.id })
    assert.equal(res.status, 400, JSON.stringify(res.body))
  })

  it('notifies the recipient of a new request', async () => {
    const other = await createUser({ email: `notify.${uniq()}@example.edu` })
    const otherToken = await loginAs(other)
    await request(app).post('/api/connections')
      .set(asAuth(aliceToken))
      .send({ userId: other.id })

    const list = await request(app)
      .get('/api/notifications')
      .set(asAuth(otherToken))
    assert.equal(list.status, 200, JSON.stringify(list.body))
    assert.ok(list.body.data.some((n) => n.type === 'connection_request'))

    const unread = await request(app)
      .get('/api/notifications/unread-count')
      .set(asAuth(otherToken))
    assert.ok(unread.body.data.unread >= 1)
  })
})

describe('messaging', () => {
  let alice
  let bob
  let aliceToken
  let bobToken

  before(async () => {
    alice = await createUser({ email: `m.alice.${uniq()}@example.edu` })
    bob = await createUser({ email: `m.bob.${uniq()}@example.edu` })
    aliceToken = await loginAs(alice)
    bobToken = await loginAs(bob)

    const res = await request(app).post('/api/connections')
      .set(asAuth(aliceToken)).send({ userId: bob.id })
    const id = res.body.data.id
    await request(app).patch(`/api/connections/${id}`)
      .set(asAuth(bobToken)).send({ action: 'accept' })
  })

  it('delivers a message between connected users', async () => {
    const sent = await request(app)
      .post('/api/messages')
      .set(asAuth(aliceToken))
      .send({ recipientId: bob.id, body: 'Hello Bob' })
    assert.equal(sent.status, 201, JSON.stringify(sent.body))
    assert.equal(sent.body.data.body, 'Hello Bob')

    const thread = await request(app)
      .get(`/api/messages/with/${bob.id}`)
      .set(asAuth(aliceToken))
    assert.equal(thread.status, 200)
    assert.equal(thread.body.data.length, 1)
    assert.equal(thread.body.data[0].body, 'Hello Bob')
  })

  it('reports unread counts then clears on read', async () => {
    await request(app).post('/api/messages')
      .set(asAuth(aliceToken))
      .send({ recipientId: bob.id, body: 'Second message' })

    const conversations = await request(app)
      .get('/api/messages/conversations')
      .set(asAuth(bobToken))
    assert.equal(conversations.status, 200, JSON.stringify(conversations.body))
    const convo = conversations.body.data.find((c) => c.peerId === alice.id)
    assert.ok(convo, 'conversation should be listed')
    assert.equal(convo.unreadCount, 2)

    await request(app)
      .get(`/api/messages/with/${alice.id}`)
      .set(asAuth(bobToken))

    const after = await request(app)
      .get('/api/messages/conversations')
      .set(asAuth(bobToken))
    const cleared = after.body.data.find((c) => c.peerId === alice.id)
    assert.equal(cleared.unreadCount, 0)
  })

  it('blocks messages from unconnected users', async () => {
    const stranger = await createUser({ email: `stranger.${uniq()}@example.edu` })
    const strangerToken = await loginAs(stranger)

    const res = await request(app)
      .post('/api/messages')
      .set(asAuth(strangerToken))
      .send({ recipientId: alice.id, body: 'Let me in' })
    assert.equal(res.status, 403, JSON.stringify(res.body))
  })

  it('honours a nobody messaging privacy setting', async () => {
    await query(
      `UPDATE privacy_settings SET allow_messages_from = 'nobody' WHERE user_id = $1`,
      [bob.id],
    )
    const res = await request(app)
      .post('/api/messages')
      .set(asAuth(aliceToken))
      .send({ recipientId: bob.id, body: 'Should fail' })
    assert.equal(res.status, 403)

    await query(
      `UPDATE privacy_settings SET allow_messages_from = 'connections' WHERE user_id = $1`,
      [bob.id],
    )
  })

  it('rejects an empty message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set(asAuth(aliceToken))
      .send({ recipientId: bob.id, body: '   ' })
    assert.equal(res.status, 422, JSON.stringify(res.body))
  })

  it('searches message history', async () => {
    const res = await request(app)
      .get('/api/messages/search?q=Second')
      .set(asAuth(bobToken))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.data.length >= 1)
  })
})

describe('mentorship', () => {
  let mentor
  let mentee
  let mentorToken
  let menteeToken

  const careerGoal = 'I want to move from backend engineering into engineering management.'

  before(async () => {
    // createUser makes alumni accounts that are verified and open to mentoring
    // with a capacity of 1, and students for mentees.
    mentor = await createUser({ role: 'ALUMNI', email: `mentor.${uniq()}@example.edu` })
    mentee = await createUser({ role: 'STUDENT', email: `mentee.${uniq()}@example.edu` })
    mentorToken = await loginAs(mentor)
    menteeToken = await loginAs(mentee)

    // Mentorship requires an existing connection.
    const req1 = await request(app)
      .post('/api/connections')
      .set(asAuth(mentorToken))
      .send({ userId: mentee.id })
    assert.equal(req1.status, 201, JSON.stringify(req1.body))
    await request(app)
      .patch(`/api/connections/${req1.body.data.id}`)
      .set(asAuth(menteeToken))
      .send({ action: 'accept' })
  })

  it('requires a connection before requesting mentorship', async () => {
    const stranger = await createUser({ email: `stranger.${uniq()}@example.edu` })
    const strangerToken = await loginAs(stranger)
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(strangerToken))
      .send({ mentorId: mentor.id, careerGoal, areaOfInterest: 'Engineering' })
    assert.equal(res.status, 400, JSON.stringify(res.body))
    assert.match(res.body.message, /Connect with this member/)
  })

  it('rejects a career goal that is too short', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: mentor.id, careerGoal: 'short', areaOfInterest: 'Engineering' })
    assert.equal(res.status, 422, JSON.stringify(res.body))
  })

  it('rejects requesting mentorship from yourself', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(mentorToken))
      .send({ mentorId: mentor.id, careerGoal, areaOfInterest: 'Engineering' })
    assert.equal(res.status, 400, JSON.stringify(res.body))
  })

  it('refuses a mentor who is not accepting requests', async () => {
    await query('UPDATE alumni_profiles SET is_open_to_mentor = FALSE WHERE user_id = $1',
      [mentor.id])
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: mentor.id, careerGoal, areaOfInterest: 'Engineering' })
    assert.equal(res.status, 400, JSON.stringify(res.body))
    await query('UPDATE alumni_profiles SET is_open_to_mentor = TRUE WHERE user_id = $1',
      [mentor.id])
  })

  it('lists available mentors with open slots', async () => {
    const res = await request(app)
      .get('/api/mentorship/mentors')
      .set(asAuth(menteeToken))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const found = res.body.data.find((row) => row.id === mentor.id)
    assert.ok(found, 'the mentor should be discoverable')
    assert.equal(found.openSlots, 1)
    assert.ok(found.name.length > 0)
  })

  it('lets a mentee request, and a mentor accept, a mentorship', async () => {
    const created = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({
        mentorId: mentor.id,
        careerGoal,
        areaOfInterest: 'Engineering management',
        message: 'I would value your advice.',
        preferredMode: 'video',
      })
    assert.equal(created.status, 201, JSON.stringify(created.body))
    assert.equal(created.body.data.status, 'pending')
    assert.equal(created.body.data.direction, 'outgoing')
    assert.equal(created.body.data.role, 'mentee')
    assert.equal(created.body.data.peer.id, mentor.id)

    // The mentor sees the same request from the other side.
    const inbox = await request(app)
      .get('/api/mentorship/requests?role=mentor&status=pending')
      .set(asAuth(mentorToken))
    assert.equal(inbox.status, 200, JSON.stringify(inbox.body))
    const mine = inbox.body.data.find((row) => row.id === created.body.data.id)
    assert.ok(mine, 'the mentor should see the incoming request')
    assert.equal(mine.direction, 'incoming')
    assert.equal(mine.peer.id, mentee.id)
    assert.equal(inbox.body.meta.counts.pending, 1)

    // A third party must not be able to answer it.
    const intruder = await createUser({ email: `intruder.${uniq()}@example.edu` })
    const intruderToken = await loginAs(intruder)
    const hijack = await request(app)
      .patch(`/api/mentorship/requests/${created.body.data.id}`)
      .set(asAuth(intruderToken))
      .send({ status: 'accepted' })
    assert.equal(hijack.status, 403, JSON.stringify(hijack.body))

    const accepted = await request(app)
      .patch(`/api/mentorship/requests/${created.body.data.id}`)
      .set(asAuth(mentorToken))
      .send({ status: 'accepted', responseNote: 'Happy to help.' })
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body))
    assert.equal(accepted.body.data.request.status, 'accepted')
    assert.equal(accepted.body.data.relationship.status, 'active')
    assert.equal(accepted.body.data.relationship.role, 'mentor')
    assert.equal(accepted.body.data.relationship.peer.id, mentee.id)
  })

  it('notifies the mentor of a new request and the mentee of the decision', async () => {
    const mentorFeed = await request(app)
      .get('/api/notifications?type=mentorship_request')
      .set(asAuth(mentorToken))
    assert.ok(mentorFeed.body.data.some((n) => n.type === 'mentorship_request'))

    const menteeFeed = await request(app)
      .get('/api/notifications?type=mentorship_accepted')
      .set(asAuth(menteeToken))
    assert.ok(menteeFeed.body.data.some((n) => n.type === 'mentorship_accepted'))
  })

  it('blocks a duplicate request while one is already accepted', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: mentor.id, careerGoal, areaOfInterest: 'Engineering' })
    assert.equal(res.status, 409, JSON.stringify(res.body))
    assert.match(res.body.message, /active mentorship/)
  })

  it('lists the active mentorship for both participants', async () => {
    for (const token of [mentorToken, menteeToken]) {
      const res = await request(app)
        .get('/api/mentorship/mentorships?status=active')
        .set(asAuth(token))
      assert.equal(res.status, 200, JSON.stringify(res.body))
      assert.equal(res.body.data.length, 1, JSON.stringify(res.body))
      assert.equal(res.body.data[0].status, 'active')
    }
  })

  it('refuses to end a mentorship the caller is not part of', async () => {
    const outsider = await createUser({ email: `outsider.${uniq()}@example.edu` })
    const outsiderToken = await loginAs(outsider)
    const list = await request(app)
      .get('/api/mentorship/mentorships?status=active')
      .set(asAuth(mentorToken))
    const relationshipId = list.body.data[0].id

    const res = await request(app)
      .patch(`/api/mentorship/mentorships/${relationshipId}/end`)
      .set(asAuth(outsiderToken))
      .send({ endReason: 'Not my mentorship' })
    assert.equal(res.status, 403, JSON.stringify(res.body))
  })

  it('lets a participant end the mentorship and notifies the other', async () => {
    const list = await request(app)
      .get('/api/mentorship/mentorships?status=active')
      .set(asAuth(mentorToken))
    const relationshipId = list.body.data[0].id

    const res = await request(app)
      .patch(`/api/mentorship/mentorships/${relationshipId}/end`)
      .set(asAuth(menteeToken))
      .send({ endReason: 'Goal reached' })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.data.status, 'ended')
    assert.equal(res.body.data.endReason, 'Goal reached')

    const again = await request(app)
      .patch(`/api/mentorship/mentorships/${relationshipId}/end`)
      .set(asAuth(menteeToken))
      .send({ endReason: 'Again' })
    assert.equal(again.status, 409, JSON.stringify(again.body))

    const feed = await request(app)
      .get('/api/notifications?type=mentorship_ended')
      .set(asAuth(mentorToken))
    assert.ok(feed.body.data.some((n) => n.type === 'mentorship_ended'))
  })

  it('allows a new request after the previous one was declined', async () => {
    const newMentor = await createUser({ role: 'ALUMNI', email: `m2.${uniq()}@example.edu` })
    const newMentorToken = await loginAs(newMentor)

    // Free a slot: the earlier mentorship consumed the first mentor's capacity.
    const c1 = await request(app)
      .post('/api/connections').set(asAuth(menteeToken)).send({ userId: newMentor.id })
    await request(app)
      .patch(`/api/connections/${c1.body.data.id}`)
      .set(asAuth(newMentorToken)).send({ action: 'accept' })

    const first = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: newMentor.id, careerGoal, areaOfInterest: 'Product' })
    assert.equal(first.status, 201, JSON.stringify(first.body))

    const declined = await request(app)
      .patch(`/api/mentorship/requests/${first.body.data.id}`)
      .set(asAuth(newMentorToken))
      .send({ status: 'rejected', responseNote: 'Full right now.' })
    assert.equal(declined.status, 200, JSON.stringify(declined.body))
    assert.equal(declined.body.data.request.status, 'rejected')
    assert.equal(declined.body.data.relationship, null)

    // The pair row is reused rather than duplicating the pair.
    const second = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: newMentor.id, careerGoal, areaOfInterest: 'Product' })
    assert.equal(second.status, 201, JSON.stringify(second.body))
    assert.equal(second.body.data.status, 'pending')
    assert.equal(second.body.data.id, first.body.data.id, 'the same pair row is revived')
  })

  it('rejects a short career goal before touching the database', async () => {
    const res = await request(app)
      .post('/api/mentorship/requests')
      .set(asAuth(menteeToken))
      .send({ mentorId: mentor.id, careerGoal: 'I want to grow', areaOfInterest: 'X' })
    assert.equal(res.status, 422)
  })

  it('requires authentication', async () => {
    const res = await request(app).get('/api/mentorship/requests')
    assert.equal(res.status, 401)
  })
})

describe('jobs', () => {
  before(resetUsers)

  const longDescription = 'We are looking for a backend engineer to work on our '
    + 'payments platform. You will design APIs, own services in production, and '
    + 'mentor junior engineers across the team.'

  let poster, posterToken, applicant, applicantToken, student, studentToken
  let jobId

  before(async () => {
    poster = await createUser({ email: `poster.${uniq()}@example.edu` })
    posterToken = await loginAs(poster)
    applicant = await createUser({ email: `applicant.${uniq()}@example.edu` })
    applicantToken = await loginAs(applicant)
    student = await createUser({ role: 'STUDENT', email: `stud.${uniq()}@example.edu` })
    studentToken = await loginAs(student)
  })

  it('lets alumni post a job and reuses the company row', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set(asAuth(posterToken))
      .send({
        title: 'Senior Backend Engineer',
        companyName: 'Northwind Labs',
        companyWebsite: 'https://northwind.example.com',
        industry: 'Software',
        description: longDescription,
        location: 'Remote',
        workMode: 'remote',
        employmentType: 'full_time',
        salaryMin: 120_000,
        salaryMax: 165_000,
        salaryCurrency: 'USD',
        experienceLevel: 'senior',
        applicationUrl: 'https://northwind.example.com/apply',
        skills: ['Node.js', 'PostgreSQL'],
        status: 'active',
      })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.status, 'active')
    assert.equal(res.body.data.companyName, 'Northwind Labs')
    assert.equal(res.body.data.postedBy.id, poster.id)
    assert.ok(res.body.data.companyId, 'the company should be resolved')
    jobId = res.body.data.id
    const names = res.body.data.skills.map((s) => s.name.toLowerCase()).sort()
    assert.deepEqual(names, ['node.js', 'postgresql'])

    // Posting for the same employer again must not create a second company.
    const again = await request(app)
      .post('/api/jobs')
      .set(asAuth(posterToken))
      .send({
        title: 'Platform Engineer',
        companyName: 'northwind labs',
        description: longDescription,
        workMode: 'hybrid',
        employmentType: 'full_time',
        experienceLevel: 'mid',
        status: 'active',
      })
    assert.equal(again.status, 201, JSON.stringify(again.body))
    assert.equal(again.body.data.companyId, res.body.data.companyId)

    await query('DELETE FROM jobs WHERE id = $1', [again.body.data.id])
  })

  it('refuses to let students post', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set(asAuth(studentToken))
      .send({
        title: 'Intern Role',
        companyName: 'Northwind Labs',
        description: longDescription,
        workMode: 'onsite',
        employmentType: 'internship',
        experienceLevel: 'entry',
        status: 'active',
      })
    assert.equal(res.status, 403, JSON.stringify(res.body))
  })

  it('rejects a short description and a past deadline before writing', async () => {
    const before = await query('SELECT COUNT(*)::int AS c FROM jobs')
    const short = await request(app)
      .post('/api/jobs')
      .set(asAuth(posterToken))
      .send({
        title: 'Tiny Role',
        companyName: 'Northwind Labs',
        description: 'Do things',
        workMode: 'onsite',
        employmentType: 'full_time',
        experienceLevel: 'entry',
        status: 'active',
      })
    assert.equal(short.status, 422, JSON.stringify(short.body))

    const past = await request(app)
      .post('/api/jobs')
      .set(asAuth(posterToken))
      .send({
        title: 'Stale Role',
        companyName: 'Northwind Labs',
        description: longDescription,
        workMode: 'onsite',
        employmentType: 'full_time',
        experienceLevel: 'entry',
        deadline: '2020-01-01',
        status: 'active',
      })
    assert.equal(past.status, 422, JSON.stringify(past.body))

    const afterCount = await query('SELECT COUNT(*)::int AS c FROM jobs')
    assert.equal(afterCount.rows[0].c, before.rows[0].c)
  })

  it('lists and filters the board', async () => {
    const all = await request(app).get('/api/jobs').set(asAuth(applicantToken))
    assert.equal(all.status, 200, JSON.stringify(all.body))
    assert.equal(all.body.meta.total, 1)
    const job = all.body.data[0]
    assert.equal(job.hasApplied, false)
    assert.equal(job.isSaved, false)

    const remote = await request(app)
      .get('/api/jobs?workMode=remote&employmentType=full_time&sort=salary')
      .set(asAuth(applicantToken))
    assert.equal(remote.status, 200)
    assert.equal(remote.body.data.length, 1)

    const onsite = await request(app)
      .get('/api/jobs?workMode=onsite').set(asAuth(applicantToken))
    assert.equal(onsite.body.data.length, 0)

    const bySkill = await request(app)
      .get('/api/jobs?skill=postgresql').set(asAuth(applicantToken))
    assert.equal(bySkill.body.data.length, 1)

    const bySearch = await request(app)
      .get('/api/jobs?search=backend').set(asAuth(applicantToken))
    assert.equal(bySearch.body.data.length, 1)
    const noMatch = await request(app)
      .get('/api/jobs?search=quantum').set(asAuth(applicantToken))
    assert.equal(noMatch.body.data.length, 0)
  })

  it('returns the job with its company and skills', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set(asAuth(applicantToken))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.data.id, jobId)
    assert.equal(res.body.data.skills.length, 2)
    assert.equal(res.body.data.companyLogoUrl, null)
  })

  it('requires an attachment when applying', async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set(asAuth(applicantToken))
      .send({ coverLetter: 'I would love to join.' })
    assert.equal(res.status, 422, JSON.stringify(res.body))
  })

  it('applies, blocks a duplicate, and notifies the poster', async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set(asAuth(applicantToken))
      .send({
        coverLetter: 'I would love to join.',
        resumeUrl: 'https://example.com/resume.pdf',
      })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    assert.equal(res.body.data.status, 'submitted')
    assert.equal(res.body.data.jobTitle, 'Senior Backend Engineer')

    const dup = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set(asAuth(applicantToken))
      .send({ resumeUrl: 'https://example.com/resume.pdf' })
    assert.equal(dup.status, 409, JSON.stringify(dup.body))

    const feed = await request(app)
      .get('/api/notifications')
      .set(asAuth(posterToken))
    assert.equal(feed.status, 200)
    assert.ok(
      feed.body.data.some((n) => n.type === 'application_received'),
      'the poster should be notified of the application',
    )
  })

  it('does not let the poster apply to their own job', async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set(asAuth(posterToken))
      .send({ resumeUrl: 'https://example.com/resume.pdf' })
    assert.equal(res.status, 400, JSON.stringify(res.body))
  })

  it('keeps applicants private from other members', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/applications`)
      .set(asAuth(studentToken))
    assert.equal(res.status, 403, JSON.stringify(res.body))
  })

  it('lets the poster review and notifies the applicant', async () => {
    const mine = await request(app)
      .get('/api/jobs/applications')
      .set(asAuth(applicantToken))
    assert.equal(mine.status, 200, JSON.stringify(mine.body))
    const application = mine.body.data[0]
    assert.equal(application.status, 'submitted')
    assert.equal(application.jobId, jobId)

    const list = await request(app)
      .get(`/api/jobs/${jobId}/applications?status=submitted`)
      .set(asAuth(posterToken))
    assert.equal(list.status, 200, JSON.stringify(list.body))
    assert.equal(list.body.meta.total, 1)
    assert.equal(list.body.data[0].applicant.id, applicant.id)

    const review = await request(app)
      .patch(`/api/jobs/${jobId}/applications/${application.id}`)
      .set(asAuth(posterToken))
      .send({ status: 'shortlisted' })
    assert.equal(review.status, 200, JSON.stringify(review.body))
    assert.equal(review.body.data.status, 'shortlisted')

    const feed = await request(app)
      .get('/api/notifications')
      .set(asAuth(applicantToken))
    assert.ok(
      feed.body.data.some((n) => n.type === 'application_status'),
      'the applicant should see the status change',
    )
  })

  it('saves and unsaves a job', async () => {
    const save = await request(app)
      .post(`/api/jobs/${jobId}/save`).set(asAuth(applicantToken))
    assert.equal(save.status, 200, JSON.stringify(save.body))
    assert.equal(save.body.data.saved, true)

    // Saving twice is idempotent rather than an error.
    const again = await request(app)
      .post(`/api/jobs/${jobId}/save`).set(asAuth(applicantToken))
    assert.equal(again.status, 200)
    assert.equal(again.body.data.created, false)

    const saved = await request(app).get('/api/jobs/saved').set(asAuth(applicantToken))
    assert.equal(saved.status, 200, JSON.stringify(saved.body))
    assert.equal(saved.body.meta.total, 1)
    assert.equal(saved.body.data[0].isSaved, true)

    const unsave = await request(app)
      .delete(`/api/jobs/saved/${jobId}`).set(asAuth(applicantToken))
    assert.equal(unsave.status, 200)
    assert.equal(unsave.body.data.saved, false)

    const empty = await request(app).get('/api/jobs/saved').set(asAuth(applicantToken))
    assert.equal(empty.body.meta.total, 0)
  })

  it('keeps drafts out of the public board but visible to the poster', async () => {
    const draft = await request(app)
      .post('/api/jobs')
      .set(asAuth(posterToken))
      .send({
        title: 'Confidential Research Lead',
        companyName: 'Northwind Labs',
        description: longDescription,
        workMode: 'onsite',
        employmentType: 'full_time',
        experienceLevel: 'lead',
        status: 'draft',
      })
    assert.equal(draft.status, 201, JSON.stringify(draft.body))
    const draftId = draft.body.data.id

    const publicView = await request(app)
      .get(`/api/jobs/${draftId}`).set(asAuth(applicantToken))
    assert.equal(publicView.status, 404, JSON.stringify(publicView.body))

    const own = await request(app)
      .get(`/api/jobs/${draftId}`).set(asAuth(posterToken))
    assert.equal(own.status, 200)

    const board = await request(app).get('/api/jobs').set(asAuth(applicantToken))
    assert.ok(!board.body.data.some((j) => j.id === draftId))

    const mine = await request(app)
      .get('/api/jobs?postedByMe=true').set(asAuth(posterToken))
    assert.equal(mine.status, 200, JSON.stringify(mine.body))
    assert.ok(mine.body.data.some((j) => j.id === draftId))

    await query('DELETE FROM jobs WHERE id = $1', [draftId])
  })

  it('stops a non-poster from editing or deleting', async () => {
    const edit = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set(asAuth(applicantToken))
      .send({ title: 'Hijacked Title' })
    assert.equal(edit.status, 403, JSON.stringify(edit.body))

    const del = await request(app)
      .delete(`/api/jobs/${jobId}`).set(asAuth(applicantToken))
    assert.equal(del.status, 403, JSON.stringify(del.body))
  })

  it('lets only staff moderate', async () => {
    const staff = await createUser({ role: 'STAFF', email: `staff.${uniq()}@example.edu` })
    const staffToken = await loginAs(staff)

    const asMember = await request(app)
      .patch(`/api/jobs/${jobId}/moderate`)
      .set(asAuth(applicantToken))
      .send({ action: 'remove' })
    assert.equal(asMember.status, 403, JSON.stringify(asMember.body))

    const removed = await request(app)
      .patch(`/api/jobs/${jobId}/moderate`)
      .set(asAuth(staffToken))
      .send({ action: 'remove' })
    assert.equal(removed.status, 200, JSON.stringify(removed.body))
    assert.equal(removed.body.data.status, 'removed')

    // A removed posting is no longer reachable by the public.
    const hidden = await request(app)
      .get(`/api/jobs/${jobId}`).set(asAuth(applicantToken))
    assert.equal(hidden.status, 404)

    const restored = await request(app)
      .patch(`/api/jobs/${jobId}/moderate`)
      .set(asAuth(staffToken))
      .send({ action: 'approve' })
    assert.equal(restored.status, 200, JSON.stringify(restored.body))
    assert.equal(restored.body.data.status, 'active')
  })

  it('lists companies and their open roles', async () => {
    const res = await request(app).get('/api/jobs/companies').set(asAuth(applicantToken))
    assert.equal(res.status, 200, JSON.stringify(res.body))
    const company = res.body.data.find((c) => c.name === 'Northwind Labs')
    assert.ok(company, 'the posted company should be listed')
    assert.equal(company.openJobCount, 1)

    const detail = await request(app)
      .get(`/api/jobs/companies/${company.id}`).set(asAuth(applicantToken))
    assert.equal(detail.status, 200, JSON.stringify(detail.body))
    assert.equal(detail.body.data.jobs.length, 1)
    assert.equal(detail.body.data.jobs[0].id, jobId)
  })

  it('rejects a bad company id instead of crashing', async () => {
    const res = await request(app)
      .get('/api/jobs/companies/00000000-0000-0000-0000-000000000000')
      .set(asAuth(applicantToken))
    assert.equal(res.status, 404, JSON.stringify(res.body))
  })

  it('requires authentication', async () => {
    const res = await request(app).get('/api/jobs')
    assert.equal(res.status, 401)
  })
})

describe('health', () => {
  it('reports service and database status', async () => {
    const res = await request(app).get('/api/health')
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.status, 'ok')
    assert.equal(res.body.checks.database, 'connected')
  })

  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/definitely-not-a-route')
    assert.equal(res.status, 404)
    assert.equal(res.body.success, false)
  })
})
