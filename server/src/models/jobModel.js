import { query } from '../config/database.js'

/**
 * Jobs, companies, applications and saved jobs. Row-to-client mapping lives
 * here so the service and the controllers never leak snake_case columns.
 */

export function formatCompany(row) {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    industry: row.industry,
    location: row.location,
    logoUrl: row.logo_url,
    openJobCount: row.open_job_count,
    createdAt: row.created_at,
  }
}

export function formatJob(row) {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company_name,
    companyId: row.company_id,
    companyLogoUrl: row.company_logo_url,
    description: row.description,
    location: row.location,
    workMode: row.work_mode,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    salaryCurrency: row.salary_currency,
    experienceLevel: row.experience_level,
    applicationUrl: row.application_url,
    deadline: row.deadline,
    status: row.status,
    isModerated: row.is_moderated,
    viewCount: row.view_count,
    createdAt: row.created_at,
    postedBy: row.poster_id ? {
      id: row.poster_id,
      name: row.poster_name,
      avatarUrl: row.poster_avatar_url,
    } : null,
    skills: row.skills ?? [],
    applicationCount: row.application_count,
    hasApplied: row.has_applied ?? false,
    isSaved: row.is_saved ?? false,
  }
}

export function formatApplication(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    status: row.status,
    coverLetter: row.cover_letter,
    resumeUrl: row.resume_url,
    externalUrl: row.external_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    applicant: row.applicant_id ? {
      id: row.applicant_id,
      name: row.applicant_name,
      avatarUrl: row.applicant_avatar_url,
      email: row.applicant_email,
      headline: row.applicant_headline,
    } : null,
  }
}

const JOB_SELECT = `
  j.*,
  c.logo_url AS company_logo_url,
  u.id AS poster_id, u.first_name || ' ' || u.last_name AS poster_name,
  u.avatar_url AS poster_avatar_url,
  (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = j.id) AS application_count,
  EXISTS (SELECT 1 FROM job_applications a2
          WHERE a2.job_id = j.id AND a2.applicant_id = $1) AS has_applied,
  EXISTS (SELECT 1 FROM saved_jobs s
          WHERE s.job_id = j.id AND s.user_id = $1) AS is_saved
`

const JOB_JOINS = `
  FROM jobs j
  LEFT JOIN companies c ON c.id = j.company_id
  JOIN users u ON u.id = j.posted_by
`

export async function createJob(data) {
  const { rows } = await query(
    `INSERT INTO jobs (
       posted_by, company_id, company_name, title, description, location,
       work_mode, employment_type, salary_min, salary_max, salary_currency,
       experience_level, application_url, deadline, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      data.postedBy, data.companyId ?? null, data.companyName, data.title,
      data.description, data.location ?? null, data.workMode, data.employmentType,
      data.salaryMin ?? null, data.salaryMax ?? null, data.salaryCurrency,
      data.experienceLevel, data.applicationUrl ?? null, data.deadline ?? null,
      data.status,
    ],
  )
  return rows[0].id
}

export async function findJobById(id, viewerId) {
  const { rows } = await query(
    `SELECT ${JOB_SELECT} ${JOB_JOINS} WHERE j.id = $2`, [viewerId, id],
  )
  return rows[0] ?? null
}

export async function updateJob(id, postedBy, data) {
  const { rows } = await query(
    `UPDATE jobs SET
       company_id = $3, company_name = $4, title = $5, description = $6,
       location = $7, work_mode = $8, employment_type = $9, salary_min = $10,
       salary_max = $11, salary_currency = $12, experience_level = $13,
       application_url = $14, deadline = $15, status = $16, updated_at = NOW()
     WHERE id = $1 AND posted_by = $2
     RETURNING id`,
    [
      id, postedBy, data.companyId ?? null, data.companyName, data.title,
      data.description, data.location ?? null, data.workMode, data.employmentType,
      data.salaryMin ?? null, data.salaryMax ?? null, data.salaryCurrency,
      data.experienceLevel, data.applicationUrl ?? null, data.deadline ?? null,
      data.status,
    ],
  )
  return rows[0] ?? null
}

export async function deleteJob(id, postedBy) {
  const { rows } = await query(
    'DELETE FROM jobs WHERE id = $1 AND posted_by = $2 RETURNING id', [id, postedBy],
  )
  return rows.length > 0
}

export async function setJobStatus(id, postedBy, status) {
  const { rows } = await query(
    `UPDATE jobs SET status = $3, updated_at = NOW()
     WHERE id = $1 AND posted_by = $2 RETURNING id`,
    [id, postedBy, status],
  )
  return rows[0] ?? null
}

export async function incrementViewCount(id) {
  await query('UPDATE jobs SET view_count = view_count + 1 WHERE id = $1', [id])
}

export async function listJobs(viewerId, filters) {
  const conditions = []
  const params = [viewerId]

  const add = (clause, value) => {
    params.push(value)
    conditions.push(clause.replace('?', `$${params.length}`))
  }

  // Non-posters only ever browse live listings.
  if (filters.mineOnly) {
    add('j.posted_by = ?', viewerId)
  } else {
    add('j.status = ?', filters.status ?? 'active')
  }
  if (filters.workMode) add('j.work_mode = ?', filters.workMode)
  if (filters.employmentType) add('j.employment_type = ?', filters.employmentType)
  if (filters.experienceLevel) add('j.experience_level = ?', filters.experienceLevel)
  if (filters.company) add('j.company_name ILIKE ?', `%${filters.company}%`)
  if (filters.location) add('j.location ILIKE ?', `%${filters.location}%`)
  if (filters.salaryMin) add('(j.salary_max IS NULL OR j.salary_max >= ?)', filters.salaryMin)
  if (filters.search) {
    add('(j.title ILIKE ? OR j.company_name ILIKE ? OR j.description ILIKE ?)',
      `%${filters.search}%`)
  }
  if (filters.skill) {
    params.push(filters.skill)
    const idx = params.length
    conditions.push(
      `EXISTS (SELECT 1 FROM job_skills js JOIN skills s ON s.id = js.skill_id
               WHERE js.job_id = j.id AND LOWER(s.name) = LOWER($${idx}))`,
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = {
    newest: 'j.created_at DESC',
    oldest: 'j.created_at ASC',
    title: 'j.title ASC',
    deadline: 'j.deadline ASC NULLS LAST',
    salary: 'j.salary_max DESC NULLS LAST',
  }[filters.sort] ?? 'j.created_at DESC'

  const countParams = params.slice(1)
  const { rows: counts } = await query(
    `SELECT COUNT(*)::int AS c FROM jobs j ${where}`,
    countParams,
  )

  const { rows } = await query(
    `SELECT ${JOB_SELECT} ${JOB_JOINS} ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, filters.offset],
  )

  return { rows, total: counts[0].c }
}

/**
 * Resolves a company by name, creating it when missing. Requires the
 * unique index on LOWER(name) added in migration 006 for this to be atomic
 * under concurrent posting.
 */
export async function findOrCreateCompany(data) {
  const { rows } = await query(
    `INSERT INTO companies (name, website, industry, location, logo_url)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [data.name, data.website ?? null, data.industry ?? null,
      data.location ?? null, data.logoUrl ?? null],
  )
  if (rows[0]) return rows[0]

  const { rows: existing } = await query(
    `SELECT * FROM companies WHERE LOWER(name) = LOWER($1)
     ORDER BY created_at LIMIT 1`,
    [data.name],
  )
  return existing[0] ?? null
}

export async function listCompanies({ search, limit = 50, offset = 0 }) {
  const conditions = []
  const params = []
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(name ILIKE $${params.length} OR industry ILIKE $${params.length})`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows: counts } = await query(
    `SELECT COUNT(*)::int AS c FROM companies ${where}`, params,
  )
  const { rows } = await query(
    `SELECT c.*, (SELECT COUNT(*)::int FROM jobs j
                   WHERE j.company_id = c.id AND j.status = 'active') AS open_job_count
     FROM companies c ${where}
     ORDER BY c.name ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )
  return { rows, total: counts[0].c }
}

export async function findCompanyById(id) {
  const { rows } = await query(
    `SELECT c.*, (SELECT COUNT(*)::int FROM jobs j
                   WHERE j.company_id = c.id AND j.status = 'active') AS open_job_count
     FROM companies c WHERE c.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function listCompanyJobs(companyId, viewerId, { limit, offset }) {
  const { rows } = await query(
    `SELECT ${JOB_SELECT} ${JOB_JOINS}
     WHERE j.company_id = $2 AND j.status = 'active'
     ORDER BY j.created_at DESC LIMIT $3 OFFSET $4`,
    [viewerId, companyId, limit, offset],
  )
  return rows
}

/**
 * Links skills to a job by name, creating any that do not exist yet. Relies on
 * the unique index on skills(LOWER(name)) from the initial schema.
 */
export async function attachSkills(jobId, skillNames) {
  if (!skillNames?.length) return
  await query(
    `INSERT INTO skills (name) VALUES
       ${skillNames.map((_, i) => `($${i + 1})`).join(', ')}
     ON CONFLICT DO NOTHING`,
    skillNames,
  )
  await query(
    `INSERT INTO job_skills (job_id, skill_id)
     SELECT $1, s.id FROM skills s
     WHERE LOWER(s.name) = ANY(SELECT LOWER(x) FROM unnest($2::text[]) AS x)
     ON CONFLICT DO NOTHING`,
    [jobId, skillNames],
  )
}

export async function listJobSkills(jobId) {
  const { rows } = await query(
    `SELECT s.id, s.name FROM job_skills js
     JOIN skills s ON s.id = js.skill_id WHERE js.job_id = $1 ORDER BY s.name`,
    [jobId],
  )
  return rows
}

export async function createApplication(data) {
  const { rows } = await query(
    `INSERT INTO job_applications
       (job_id, applicant_id, cover_letter, resume_url, external_url, status)
     VALUES ($1,$2,$3,$4,$5,'submitted')
     RETURNING *`,
    [data.jobId, data.applicantId, data.coverLetter ?? null,
      data.resumeUrl ?? null, data.externalUrl ?? null],
  )
  return rows[0]
}

export async function findApplicationById(id) {
  const { rows } = await query(
    'SELECT * FROM job_applications WHERE id = $1', [id],
  )
  return rows[0] ?? null
}

export async function findApplicationForJob(jobId, applicantId) {
  const { rows } = await query(
    'SELECT * FROM job_applications WHERE job_id = $1 AND applicant_id = $2',
    [jobId, applicantId],
  )
  return rows[0] ?? null
}

export async function updateApplicationStatus(id, status) {
  const { rows } = await query(
    'UPDATE job_applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, status],
  )
  return rows[0] ?? null
}

const APPLICATION_SELECT = `
  a.*, j.title AS job_title, j.company_name,
  u.id AS applicant_id, u.first_name || ' ' || u.last_name AS applicant_name,
  u.avatar_url AS applicant_avatar_url, u.email AS applicant_email,
  COALESCE(ap.current_position, sp.degree) AS applicant_headline
`

const APPLICATION_JOINS = `
  FROM job_applications a
  JOIN jobs j ON j.id = a.job_id
  JOIN users u ON u.id = a.applicant_id
  LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
`

export async function listApplicationsForJob(jobId, { limit, offset, status }) {
  const params = [jobId]
  const conditions = ['a.job_id = $1']
  if (status) {
    params.push(status)
    conditions.push(`a.status = $${params.length}`)
  }
  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows: counts } = await query(
    `SELECT COUNT(*)::int AS c ${APPLICATION_JOINS} ${where}`, params,
  )
  const { rows } = await query(
    `SELECT ${APPLICATION_SELECT} ${APPLICATION_JOINS} ${where}
     ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )
  return { rows, total: counts[0].c }
}

/** Applications the given user submitted, newest first. */
export async function listMyApplications(applicantId, { limit, offset, status }) {
  const params = [applicantId]
  const conditions = ['a.applicant_id = $1']
  if (status) {
    params.push(status)
    conditions.push(`a.status = $${params.length}`)
  }
  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows: counts } = await query(
    `SELECT COUNT(*)::int AS c ${APPLICATION_JOINS} ${where}`, params,
  )
  const { rows } = await query(
    `SELECT ${APPLICATION_SELECT} ${APPLICATION_JOINS} ${where}
     ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  )
  return { rows, total: counts[0].c }
}

export async function saveJob(userId, jobId) {
  const { rows } = await query(
    `INSERT INTO saved_jobs (user_id, job_id) VALUES ($1,$2)
     ON CONFLICT DO NOTHING RETURNING job_id`,
    [userId, jobId],
  )
  return rows.length > 0
}

export async function unsaveJob(userId, jobId) {
  const { rows } = await query(
    'DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2 RETURNING job_id',
    [userId, jobId],
  )
  return rows.length > 0
}

export async function listSavedJobs(userId, { limit, offset }) {
  const { rows: counts } = await query(
    'SELECT COUNT(*)::int AS c FROM saved_jobs WHERE user_id = $1', [userId],
  )
  const { rows } = await query(
    `SELECT ${JOB_SELECT}
     ${JOB_JOINS} JOIN saved_jobs s ON s.job_id = j.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  return { rows, total: counts[0].c }
}
