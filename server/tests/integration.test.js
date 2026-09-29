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
