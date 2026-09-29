import { query } from '../config/database.js'
import * as jobModel from '../models/jobModel.js'
import * as notificationService from './notificationService.js'
import * as auditService from './auditService.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js'
import { ROLES, hasAnyRole } from '../middleware/rbac.js'

/**
 * Job board, company directory, applications and saved jobs.
 *
 * Posting is open to alumni and staff. Students may browse, save and apply,
 * but cannot post or moderate.
 */

/** Roles allowed to publish and manage their own postings. */
const POSTER_ROLES = [ROLES.ALUMNI, ROLES.MODERATOR, ROLES.ADMIN]
/** Roles allowed to moderate postings they do not own. */
const MODERATOR_ROLES = [ROLES.MODERATOR, ROLES.ADMIN]

const APPLICATION_STATUSES = new Set([
  'submitted', 'under_review', 'shortlisted', 'rejected', 'accepted', 'withdrawn',
])

function assertCanPost(user) {
  if (!hasAnyRole(user, POSTER_ROLES)) {
    throw forbidden('Only alumni and staff can post jobs')
  }
}

function isStaff(user) {
  return hasAnyRole(user, MODERATOR_ROLES)
}

/** Loads a job, throwing when missing. */
async function loadJob(id) {
  const job = await jobModel.findJobById(id, null)
  if (!job) throw notFound('Job')
  return job
}

/** Loads a job and checks the caller is allowed to change it. */
async function loadOwnJob(id, user) {
  const job = await jobModel.findJobById(id, user.id)
  if (!job) throw notFound('Job')
  if (job.posted_by !== user.id) throw forbidden('You can only manage your own postings')
  return job
}

export async function createJob(user, payload, context = {}) {
  assertCanPost(user)

  // A deadline in the past makes the posting unusable; reject it up front
  // rather than letting it sit in the board.
  if (payload.deadline && new Date(payload.deadline) < new Date()) {
    throw badRequest('The application deadline must be in the future')
  }
  if (payload.salaryMin != null && payload.salaryMax != null
      && payload.salaryMax < payload.salaryMin) {
    throw badRequest('Maximum salary must be greater than or equal to minimum salary')
  }

  // Either link an existing company or name one; the name is always stored so
  // the board still renders if the company row is later removed.
  let companyId = payload.companyId ?? null
  if (!companyId && payload.companyName) {
    const company = await jobModel.findOrCreateCompany({
      name: payload.companyName,
      website: payload.companyWebsite ?? null,
      industry: payload.industry ?? null,
      location: payload.location ?? null,
      logoUrl: payload.companyLogoUrl ?? null,
    })
    companyId = company?.id ?? null
  }

  const jobId = await jobModel.createJob({
    postedBy: user.id,
    companyId,
    companyName: payload.companyName,
    title: payload.title,
    description: payload.description,
    location: payload.location,
    workMode: payload.workMode,
    employmentType: payload.employmentType,
    salaryMin: payload.salaryMin ?? null,
    salaryMax: payload.salaryMax ?? null,
    salaryCurrency: payload.salaryCurrency ?? 'USD',
    experienceLevel: payload.experienceLevel,
    applicationUrl: payload.applicationUrl ?? null,
    deadline: payload.deadline ?? null,
    status: payload.status,
  })
  await jobModel.attachSkills(jobId, payload.skills ?? [])

  await auditService.record({
    actorId: user.id,
    action: 'job.created',
    entityType: 'job',
    entityId: jobId,
    metadata: { title: payload.title, company: payload.companyName },
    context,
  })

  return getJob(jobId, user)
}

export async function updateJob(user, jobId, payload, context = {}) {
  await loadOwnJob(jobId, user)
  if (payload.deadline && new Date(payload.deadline) < new Date()) {
    throw badRequest('The application deadline must be in the future')
  }
  if (payload.salaryMin != null && payload.salaryMax != null
      && payload.salaryMax < payload.salaryMin) {
    throw badRequest('Maximum salary must be greater than or equal to minimum salary')
  }

  let companyId = payload.companyId ?? null
  if (!companyId && payload.companyName) {
    const company = await jobModel.findOrCreateCompany({ name: payload.companyName })
    companyId = company?.id ?? null
  }

  await jobModel.updateJob(jobId, user.id, {
    companyId,
    companyName: payload.companyName,
    title: payload.title,
    description: payload.description,
    location: payload.location,
    workMode: payload.workMode,
    employmentType: payload.employmentType,
    salaryMin: payload.salaryMin ?? null,
    salaryMax: payload.salaryMax ?? null,
    salaryCurrency: payload.salaryCurrency ?? 'USD',
    experienceLevel: payload.experienceLevel,
    applicationUrl: payload.applicationUrl ?? null,
    deadline: payload.deadline ?? null,
    status: payload.status,
  })
  if (payload.skills) await jobModel.attachSkills(jobId, payload.skills)

  await auditService.record({
    actorId: user.id,
    action: 'job.updated',
    entityType: 'job',
    entityId: jobId,
    context,
  })

  return getJob(jobId, user)
}

export async function deleteJob(user, jobId, context = {}) {
  await loadOwnJob(jobId, user)
  await jobModel.deleteJob(jobId, user.id)
  await auditService.record({
    actorId: user.id,
    action: 'job.deleted',
    entityType: 'job',
    entityId: jobId,
    context,
  })
}

export async function getJob(jobId, viewer) {
  const job = await jobModel.findJobById(jobId, viewer?.id ?? null)
  if (!job) throw notFound('Job')
  // Drafts, hidden and removed listings are only visible to their poster and
  // to staff performing moderation.
  if (job.status !== 'active' && !isVisibleToStaff(job, viewer)) {
    throw notFound('Job')
  }
  job.skills = await jobModel.listJobSkills(jobId)
  return jobModel.formatJob(job)
}

function isVisibleToStaff(job, viewer) {
  if (!viewer) return false
  return job.posted_by === viewer.id || isStaff(viewer)
}

export async function listJobs(viewer, filters) {
  // postedByMe shows every status the caller owns, so it bypasses the
  // active-only filter applied to the public board.
  const { rows, total } = await jobModel.listJobs(viewer.id, {
    ...filters,
    mineOnly: filters.postedByMe === 'true',
  })
  return {
    jobs: rows.map((r) => jobModel.formatJob(r)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  }
}

export async function listCompanies(filters) {
  const { rows, total } = await jobModel.listCompanies(filters)
  return {
    companies: rows.map((r) => jobModel.formatCompany(r)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  }
}

export async function getCompany(companyId, viewer, filters = {}) {
  const company = await jobModel.findCompanyById(companyId)
  if (!company) throw notFound('Company')
  const jobs = await jobModel.listCompanyJobs(companyId, viewer.id, {
    limit: filters.limit ?? 20, offset: filters.offset ?? 0,
  })
  return {
    company: jobModel.formatCompany(company),
    jobs: jobs.map((j) => jobModel.formatJob(j)),
  }
}

export async function applyToJob(user, jobId, payload, context = {}) {
  const job = await loadJob(jobId)
  if (job.status !== 'active') throw badRequest('This job is no longer accepting applications')
  if (job.deadline && new Date(job.deadline) < new Date()) {
    throw badRequest('The application deadline for this job has passed')
  }
  if (job.posted_by === user.id) {
    throw badRequest('You cannot apply to your own posting')
  }
  // The schema requires an attachment, so a cover letter alone is not enough.
  if (!payload.resumeUrl && !payload.externalUrl) {
    throw badRequest('Provide either a resume URL or an external application URL')
  }

  const existing = await jobModel.findApplicationForJob(jobId, user.id)
  if (existing) {
    if (existing.status === 'withdrawn') {
      throw conflict('You already withdrew your application to this job')
    }
    throw conflict('You have already applied to this job')
  }

  const application = await jobModel.createApplication({
    jobId, applicantId: user.id,
    coverLetter: payload.coverLetter, resumeUrl: payload.resumeUrl,
    externalUrl: payload.externalUrl,
  })

  await notificationService.notify({
    userId: job.posted_by,
    type: 'application_received',
    title: 'New job application',
    message: `${user.first_name} applied to ${job.title} at ${job.company_name}`,
    link: `/jobs/${job.id}/applications`,
    data: { jobId, applicationId: application.id },
  })
  await auditService.record({
    actorId: user.id,
    action: 'job.applied',
    entityType: 'job_application',
    entityId: application.id,
    metadata: { jobId },
    context,
  })

  return getApplication(application.id)
}

/** Reloads an application with its job and applicant joined in. */
async function getApplication(applicationId) {
  const { rows } = await query(
    `SELECT a.*, j.title AS job_title, j.company_name,
            u.id AS applicant_id, u.first_name || ' ' || u.last_name AS applicant_name,
            u.avatar_url AS applicant_avatar_url, u.email AS applicant_email,
            COALESCE(ap.current_position, sp.degree) AS applicant_headline
     FROM job_applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = a.applicant_id
     LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE a.id = $1`,
    [applicationId],
  )
  return rows[0] ? jobModel.formatApplication(rows[0]) : null
}

export async function listApplicationsForJob(user, jobId, filters) {
  const job = await loadJob(jobId)
  if (job.posted_by !== user.id && !isStaff(user)) {
    throw forbidden('Only the poster can view applicants')
  }
  const { rows, total } = await jobModel.listApplicationsForJob(jobId, filters)
  return {
    applications: rows.map((r) => jobModel.formatApplication(r)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  }
}

/** Moves an application along the review pipeline and notifies the applicant. */
export async function reviewApplication(user, applicationId, status, context = {}) {
  if (!APPLICATION_STATUSES.has(status)) throw badRequest('Invalid application status')
  const application = await jobModel.findApplicationById(applicationId)
  if (!application) throw notFound('Application')

  const job = await loadJob(application.job_id)
  if (job.posted_by !== user.id && !isStaff(user)) {
    throw forbidden('Only the poster can review applicants')
  }
  if (application.status === 'withdrawn') {
    throw conflict('This applicant withdrew their application')
  }

  await jobModel.updateApplicationStatus(applicationId, status)
  await notificationService.notify({
    userId: application.applicant_id,
    type: 'application_status',
    title: 'Application update',
    message: `Your application for ${job.title} at ${job.company_name} is now ${status.replace('_', ' ')}`,
    link: '/jobs/applications',
    data: { jobId: job.id, applicationId, status },
  })
  await auditService.record({
    actorId: user.id,
    action: 'application.status_changed',
    entityType: 'job_application',
    entityId: applicationId,
    metadata: { from: application.status, to: status },
    context,
  })

  return getApplication(applicationId)
}

/** The applicant withdrawing their own application. */
export async function withdrawApplication(user, applicationId, context = {}) {
  const application = await jobModel.findApplicationById(applicationId)
  if (!application) throw notFound('Application')
  if (application.applicant_id !== user.id) {
    throw forbidden('You can only withdraw your own application')
  }
  if (application.status === 'withdrawn') {
    throw conflict('This application is already withdrawn')
  }

  await jobModel.updateApplicationStatus(applicationId, 'withdrawn')
  await auditService.record({
    actorId: user.id,
    action: 'application.withdrawn',
    entityType: 'job_application',
    entityId: applicationId,
    context,
  })
  return getApplication(applicationId)
}

export async function listMyApplications(user, filters) {
  const { rows, total } = await jobModel.listMyApplications(user.id, filters)
  return {
    applications: rows.map((r) => jobModel.formatApplication(r)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  }
}

export async function saveJob(user, jobId) {
  const job = await loadJob(jobId)
  if (job.status !== 'active') throw badRequest('This job is no longer accepting applications')
  const created = await jobModel.saveJob(user.id, jobId)
  return { saved: true, created }
}

export async function unsaveJob(user, jobId) {
  await jobModel.unsaveJob(user.id, jobId)
  return { saved: false }
}

export async function listSavedJobs(user, filters) {
  const { rows, total } = await jobModel.listSavedJobs(user.id, filters)
  return {
    jobs: rows.map((r) => jobModel.formatJob(r)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(1, Math.ceil(total / filters.limit)),
  }
}

export async function moderateJob(user, jobId, action, context = {}) {
  if (!isStaff(user)) throw forbidden('Only staff can moderate jobs')
  const job = await loadJob(jobId)
  const target = action === 'remove' ? 'removed' : 'active'
  if (job.status === target) return jobModel.formatJob(job)

  await jobModel.setJobStatus(jobId, job.posted_by, target)
  await notificationService.notify({
    userId: job.posted_by,
    type: 'job_moderated',
    title: action === 'remove' ? 'Posting removed' : 'Posting approved',
    message: action === 'remove'
      ? `Your posting for ${job.title} was removed by a moderator`
      : `Your posting for ${job.title} is now live`,
    link: '/jobs',
    data: { jobId },
  })
  await auditService.record({
    actorId: user.id,
    action: `job.${action}d`,
    entityType: 'job',
    entityId: jobId,
    context,
  })
  return getJob(jobId, user)
}
