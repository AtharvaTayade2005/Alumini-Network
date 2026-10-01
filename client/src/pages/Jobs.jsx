import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { jobs } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field,
  Input, LoadingBlock, Pagination, Select, Textarea, cx,
} from '../components/ui.jsx'

/**
 * The whole job board lives in one route. `/jobs` is the board, and the
 * sub-paths below it select a detail view, so the shared filter state and the
 * "go back to the board" behaviour stay in one component.
 */

const STACK = 'flex flex-col gap-6'
const ROW = 'flex flex-wrap items-center gap-2'
const GRID = 'grid gap-4 md:grid-cols-2'
const MUTED = 'text-sm text-swiss-muted'
const MUTED_SMALL = 'text-xs text-swiss-label'
const FLUSH = 'rounded-sm border border-swiss-border bg-swiss-surface p-5 border border-swiss-border'
const PROSE = 'whitespace-pre-line text-sm leading-relaxed text-swiss-muted'

/** Matches the Button ghost variant so links can be styled as buttons. */
const LINK_BUTTON = 'inline-flex items-center justify-center rounded-sm px-3.5 py-2 '
  + 'text-sm font-medium text-swiss-muted transition-colors hover:bg-swiss-surface'

const WORK_MODES = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On site']]
const EMPLOYMENT_TYPES = [
  ['full_time', 'Full time'], ['part_time', 'Part time'],
  ['internship', 'Internship'], ['contract', 'Contract'],
]
const LEVELS = [['entry', 'Entry'], ['mid', 'Mid'], ['senior', 'Senior'], ['lead', 'Lead']]
const SORTS = [
  ['newest', 'Newest first'], ['deadline', 'Closing soon'],
  ['salary', 'Highest salary'], ['title', 'Title (A-Z)'],
]
const APPLICATION_TONES = {
  submitted: 'blue',
  under_review: 'amber',
  shortlisted: 'green',
  rejected: 'red',
  accepted: 'green',
  withdrawn: 'slate',
}
const EMPTY_FILTERS = {
  search: '', workMode: '', employmentType: '', experienceLevel: '',
  location: '', skill: '', sort: 'newest',
}

const label = (options, value) => options.find(([v]) => v === value)?.[1] ?? value

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return 'Salary not disclosed'
  const fmt = (n) => `${job.salaryCurrency ?? 'USD'} ${n.toLocaleString()}`
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`
  return job.salaryMin ? `From ${fmt(job.salaryMin)}` : `Up to ${fmt(job.salaryMax)}`
}

/** Urgency of the application deadline, or null when the job has none. */
function deadlineLabel(job) {
  if (!job.deadline) return null
  const days = Math.ceil((new Date(job.deadline) - Date.now()) / 86_400_000)
  if (days < 0) return { text: 'Applications closed', tone: 'red' }
  if (days === 0) return { text: 'Closes today', tone: 'amber' }
  if (days <= 7) return { text: `${days} days left`, tone: 'amber' }
  return { text: `Closes ${formatDate(job.deadline)}`, tone: 'slate' }
}

function MetaList({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-swiss-label">
      {items.filter(Boolean).map((item) => (
        <li key={item} className="after:ml-2 after:text-swiss-border last:after:content-['']">
          {item}
        </li>
      ))}
    </ul>
  )
}

function JobCard({ job, onSave, busy }) {
  const deadline = deadlineLabel(job)
  return (
    <article className={FLUSH}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/jobs/${job.id}`}
            className="block truncate font-semibold text-swiss-text hover:underline"
          >
            {job.title}
          </Link>
          <p className={cx('truncate', MUTED)}>{job.companyName}</p>
        </div>
        <Badge tone={job.status === 'active' ? 'green' : 'slate'}>
          {job.status === 'active' ? 'Open' : job.status}
        </Badge>
      </div>

      <MetaList items={[
        job.location || 'Location flexible',
        label(WORK_MODES, job.workMode),
        label(EMPLOYMENT_TYPES, job.employmentType),
        label(LEVELS, job.experienceLevel),
      ]} />

      <p className="mt-2 text-sm font-medium text-swiss-text">{formatSalary(job)}</p>

      {job.skills?.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((skill) => (
            <li key={skill.id}><Badge tone="slate">{skill.name}</Badge></li>
          ))}
        </ul>
      ) : null}

      {deadline && deadline.tone !== 'red' ? (
        <p className={cx('mt-2', MUTED_SMALL)}>{deadline.text}</p>
      ) : null}

      <div className={cx(ROW, 'mt-4')}>
        <Button onClick={() => onSave(job)} disabled={busy || job.status !== 'active'}>
          {job.isSaved ? 'Saved' : 'Save'}
        </Button>
        <Link to={`/jobs/${job.id}`} className={LINK_BUTTON}>View details</Link>
        {job.hasApplied ? <Badge tone="blue">Applied</Badge> : null}
      </div>
    </article>
  )
}

function ApplyPanel({ job, onDone }) {
  const [form, setForm] = useState({ coverLetter: '', resumeUrl: '', externalUrl: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await jobs.apply(job.id, {
        coverLetter: form.coverLetter || undefined,
        resumeUrl: form.resumeUrl || undefined,
        externalUrl: form.externalUrl || undefined,
      })
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={STACK} onSubmit={submit}>
      <Alert tone="info">
        Attach a resume link or point us to where you applied. One of the two is required.
      </Alert>
      {error ? <Alert>{error.message}</Alert> : null}
      <Field label="Resume link" hint="A public URL to your CV or resume.">
        <Input value={form.resumeUrl} onChange={set('resumeUrl')} placeholder="https://" />
      </Field>
      <Field label="External application link" hint="If the employer uses their own form.">
        <Input value={form.externalUrl} onChange={set('externalUrl')} placeholder="https://" />
      </Field>
      <Field label="Cover letter">
        <Textarea rows={5} value={form.coverLetter} onChange={set('coverLetter')} maxLength={5000} />
      </Field>
      <Button type="submit" disabled={busy}>{busy ? 'Submitting' : 'Submit application'}</Button>
    </form>
  )
}

function JobDetail({ jobId, onBack }) {
  const [job, setJob] = useState(null)
  const [state, setState] = useState({ loading: true, error: null })
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const response = await jobs.byId(jobId)
      setJob(response.data)
      setState({ loading: false, error: null })
    } catch (error) {
      setState({ loading: false, error })
    }
  }, [jobId])

  useEffect(() => { load() }, [load])

  async function toggleSave() {
    setBusy(true)
    try {
      if (job.isSaved) await jobs.unsave(job.id)
      else await jobs.save(job.id)
      await load()
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (state.loading) return <Card><LoadingBlock rows={6} label="Loading job" /></Card>
  if (state.error) return <Card><ErrorState error={state.error} onRetry={load} /></Card>
  if (!job) return null

  const deadline = deadlineLabel(job)

  return (
    <div className={STACK}>
      <Button variant="ghost" onClick={onBack}>Back to all jobs</Button>

      {notice ? <Alert tone="error" onDismiss={() => setNotice(null)}>{notice.text}</Alert> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-swiss-text">{job.title}</h2>
            <p className={MUTED}>
              {job.companyName}
              {job.companyId ? (
                <> · <Link to={`/jobs/company/${job.companyId}`} className="underline">View company</Link></>
              ) : null}
            </p>
          </div>
          <Badge tone={job.status === 'active' ? 'green' : 'slate'}>{job.status}</Badge>
        </div>

        <div className="mt-3">
          <MetaList items={[
            job.location || 'Location flexible',
            label(WORK_MODES, job.workMode),
            label(EMPLOYMENT_TYPES, job.employmentType),
            label(LEVELS, job.experienceLevel),
            formatSalary(job),
          ]} />
        </div>

        {job.skills?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <li key={skill.id}><Badge tone="slate">{skill.name}</Badge></li>
            ))}
          </ul>
        ) : null}

        {job.deadline ? (
          <p className={cx('mt-3', MUTED_SMALL)}>Applications close {formatDate(job.deadline)}</p>
        ) : null}
        {job.postedBy ? (
          <p className={cx('mt-1', MUTED_SMALL)}>Posted by {job.postedBy.name}</p>
        ) : null}

        <div className={cx(ROW, 'mt-4')}>
          <Button onClick={toggleSave} disabled={busy}>
            {job.isSaved ? 'Remove from saved' : 'Save job'}
          </Button>
          {job.applicationUrl ? (
            <a
              className={LINK_BUTTON}
              href={job.applicationUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Apply on employer site
            </a>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-base font-semibold text-swiss-text">About this role</h3>
        <p className={PROSE}>{job.description}</p>
      </Card>

      {job.hasApplied ? (
        <Alert tone="success" title="You have applied">
          The employer can see your application. Track it under “My applications”.
        </Alert>
      ) : applying ? (
        <Card>
          <h3 className="mb-3 text-base font-semibold text-swiss-text">Apply to {job.title}</h3>
          <ApplyPanel job={job} onDone={() => { setApplying(false); load() }} />
        </Card>
      ) : job.status === 'active' ? (
        <Card>
          <div className={ROW}>
            <Button onClick={() => setApplying(true)}>Apply for this job</Button>
            {deadline?.tone === 'red' ? (
              <span className={MUTED_SMALL}>This role is no longer accepting applications.</span>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function CompanyDetail({ companyId, onBack }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState({ loading: true, error: null })

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const response = await jobs.company(companyId)
      setData(response.data)
      setState({ loading: false, error: null })
    } catch (error) {
      setState({ loading: false, error })
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  if (state.loading) return <Card><LoadingBlock rows={4} label="Loading company" /></Card>
  if (state.error) return <Card><ErrorState error={state.error} onRetry={load} /></Card>
  if (!data?.company) return null

  return (
    <div className={STACK}>
      <Button variant="ghost" onClick={onBack}>Back to all jobs</Button>
      <Card>
        <h2 className="text-lg font-semibold text-swiss-text">{data.company.name}</h2>
        <p className={MUTED}>
          {[data.company.industry, data.company.location].filter(Boolean).join(' · ')}
        </p>
        {data.company.website ? (
          <a
            className="text-sm text-swiss-muted underline"
            href={data.company.website}
            target="_blank"
            rel="noreferrer noopener"
          >
            {data.company.website}
          </a>
        ) : null}
        <p className={cx('mt-2', MUTED_SMALL)}>{data.company.openJobCount} open roles</p>
      </Card>
      <CardHeader title="Open roles" />
      <div className={GRID}>
        {data.jobs.map((job) => <JobCard key={job.id} job={job} busy onSave={() => {}} />)}
      </div>
    </div>
  )
}

function MyApplications() {
  const [rows, setRows] = useState([])
  const [state, setState] = useState({ loading: true, error: null })
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const response = await jobs.myApplications({ limit: 50 })
      setRows(response.data ?? [])
      setState({ loading: false, error: null })
    } catch (error) {
      setState({ loading: false, error })
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function withdraw(id) {
    setBusyId(id)
    try {
      await jobs.withdraw(id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (state.loading) return <Card><LoadingBlock rows={3} label="Loading applications" /></Card>
  if (state.error) return <Card><ErrorState error={state.error} onRetry={load} /></Card>

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="No applications yet" description="Apply to a role and it will show up here." />
      </Card>
    )
  }

  return (
    <div className={STACK}>
      {rows.map((application) => (
        <article key={application.id} className={FLUSH}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/jobs/${application.jobId}`}
                className="block truncate font-semibold text-swiss-text hover:underline"
              >
                {application.jobTitle}
              </Link>
              <p className={cx('truncate', MUTED_SMALL)}>{application.companyName}</p>
            </div>
            <Badge tone={APPLICATION_TONES[application.status] ?? 'slate'}>
              {application.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className={cx('mt-2', MUTED_SMALL)}>
            Applied {formatDate(application.createdAt)}
          </p>
          {application.status === 'submitted' ? (
            <div className={cx(ROW, 'mt-3')}>
              <Button
                variant="ghost"
                onClick={() => withdraw(application.id)}
                disabled={busyId === application.id}
              >
                Withdraw
              </Button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function PostJobForm({ onDone }) {
  const [form, setForm] = useState({
    title: '', companyName: '', companyWebsite: '', industry: '',
    description: '', location: '', workMode: 'remote', employmentType: 'full_time',
    salaryMin: '', salaryMax: '', salaryCurrency: 'USD', experienceLevel: 'mid',
    applicationUrl: '', deadline: '', skills: '', status: 'active',
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const numeric = (v) => (v === '' ? undefined : Number(v))
    try {
      await jobs.create({
        title: form.title,
        companyName: form.companyName,
        companyWebsite: form.companyWebsite || undefined,
        industry: form.industry || undefined,
        description: form.description,
        location: form.location || undefined,
        workMode: form.workMode,
        employmentType: form.employmentType,
        salaryMin: numeric(form.salaryMin),
        salaryMax: numeric(form.salaryMax),
        salaryCurrency: form.salaryCurrency,
        experienceLevel: form.experienceLevel,
        applicationUrl: form.applicationUrl || undefined,
        deadline: form.deadline || undefined,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        status: form.status,
      })
      onDone()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <form className={STACK} onSubmit={submit}>
        {error ? <Alert>{error.message}</Alert> : null}
        <Field label="Job title" required>
          <Input value={form.title} onChange={set('title')} required maxLength={200} />
        </Field>
        <Field label="Company" required hint="We will create the company if it is new.">
          <Input value={form.companyName} onChange={set('companyName')} required maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company website">
            <Input value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://" />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={set('industry')} maxLength={120} />
          </Field>
        </div>
        <Field
          label="Description"
          required
          hint="At least 50 characters. What the role involves and who you are looking for."
        >
          <Textarea rows={8} value={form.description} onChange={set('description')} required />
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={set('location')} maxLength={150} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work mode">
            <Select value={form.workMode} onChange={set('workMode')}>
              {WORK_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Employment type">
            <Select value={form.employmentType} onChange={set('employmentType')}>
              {EMPLOYMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Experience level">
            <Select value={form.experienceLevel} onChange={set('experienceLevel')}>
              {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Publish as">
            <Select value={form.status} onChange={set('status')}>
              <option value="active">Open listing</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Salary from">
            <Input type="number" min="0" value={form.salaryMin} onChange={set('salaryMin')} />
          </Field>
          <Field label="Salary to">
            <Input type="number" min="0" value={form.salaryMax} onChange={set('salaryMax')} />
          </Field>
          <Field label="Currency">
            <Input value={form.salaryCurrency} onChange={set('salaryCurrency')} maxLength={3} />
          </Field>
        </div>
        <Field label="Skills" hint="Comma separated, for example: React, Node.js, SQL">
          <Input value={form.skills} onChange={set('skills')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="External application link">
            <Input value={form.applicationUrl} onChange={set('applicationUrl')} placeholder="https://" />
          </Field>
          <Field label="Application deadline">
            <Input type="date" value={form.deadline} onChange={set('deadline')} />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>{busy ? 'Posting' : 'Post job'}</Button>
      </form>
    </Card>
  )
}

function PostJobReview({ jobId, onBack }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState({ loading: true, error: null })
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const response = await jobs.applicationsForJob(jobId, { limit: 100 })
      setRows(response.data ?? [])
      setState({ loading: false, error: null })
    } catch (error) {
      setState({ loading: false, error })
    }
  }, [jobId])

  useEffect(() => { load() }, [load])

  async function review(id, status) {
    setBusyId(id)
    try {
      await jobs.review(jobId, id, status)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={STACK}>
      <Button variant="ghost" onClick={onBack}>Back to all jobs</Button>
      <CardHeader title="Applicants" description="Move applicants through your pipeline." />
      {state.loading ? <Card><LoadingBlock rows={3} label="Loading applicants" /></Card> : null}
      {state.error ? <Card><ErrorState error={state.error} onRetry={load} /></Card> : null}
      {!state.loading && rows.length === 0 ? (
        <Card>
          <EmptyState title="No applicants yet" description="Applications will appear here." />
        </Card>
      ) : null}
      {rows.map((application) => (
        <article key={application.id} className={FLUSH}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block truncate font-semibold text-swiss-text">
                {application.applicant?.name}
              </span>
              <p className={cx('truncate', MUTED_SMALL)}>
                {application.applicant?.headline ?? 'Applicant'}
              </p>
            </div>
            <Badge tone={APPLICATION_TONES[application.status] ?? 'slate'}>
              {application.status.replace('_', ' ')}
            </Badge>
          </div>
          {application.coverLetter ? (
            <p className={cx('border-l-2 border-swiss-border pl-3 text-sm text-swiss-muted', PROSE)}>
              {application.coverLetter}
            </p>
          ) : null}
          {application.status !== 'withdrawn' ? (
            <div className={cx(ROW, 'mt-3')}>
              <Button onClick={() => review(application.id, 'shortlisted')} disabled={busyId === application.id}>
                Shortlist
              </Button>
              <Button
                variant="secondary"
                onClick={() => review(application.id, 'rejected')}
                disabled={busyId === application.id}
              >
                Reject
              </Button>
            </div>
          ) : (
            <p className={cx('mt-3', MUTED_SMALL)}>The applicant withdrew this application.</p>
          )}
        </article>
      ))}
    </div>
  )
}

const TABS = [
  ['board', 'Job board'],
  ['saved', 'Saved'],  ['applications', 'My applications'],
  ['mine', 'My postings'],
  ['post', 'Post a job'],
]

/** Tabs that own a URL, as opposed to the two that are local UI state. */
const ROUTED_TABS = new Set(['board', 'saved', 'applications'])

/** Roles allowed to post a job. */
const POSTING_ROLES = ['ALUMNI', 'MODERATOR', 'ADMIN']

function tabClass(isActive) {
  return cx(
    'inline-flex items-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-swiss-muted hover:bg-swiss-surface hover:text-swiss-text',
  )
}

function clean(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  )
}

export default function Jobs({ view: routeView = 'board' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [result, setResult] = useState({ rows: [], meta: null, loading: true, error: null })
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  // 'mine' and 'post' have no route of their own, so they are tracked here and
  // survive navigation between the routed tabs.
  const [localTab, setLocalTab] = useState(null)
  // Bumped after posting so the 'mine' list refetches without remounting.
  const [reloadKey, setReloadKey] = useState(0)
  const tab = localTab ?? routeView

  // Only alumni and staff may post a job.
  const canPost = Boolean(
    user?.roles?.some((role) => POSTING_ROLES.includes(role)),
  )

  const load = useCallback(async (params) => {
    setResult((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await jobs.list({ limit: 20, ...params })
      setResult({
        rows: response.data ?? [], meta: response.meta ?? null, loading: false, error: null,
      })
    } catch (error) {
      setResult((prev) => ({ ...prev, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    if (tab === 'board') load(clean(applied))
  }, [tab, applied, load])

  useEffect(() => {
    if (tab !== 'mine') return
    setResult((prev) => ({ ...prev, loading: true, error: null }))
    jobs.list({ postedByMe: 'true', limit: 50 })
      .then((response) => setResult({
        rows: response.data ?? [], meta: response.meta ?? null, loading: false, error: null,
      }))
      .catch((error) => setResult((prev) => ({ ...prev, loading: false, error })))
  }, [tab, reloadKey])

  useEffect(() => {
    if (tab !== 'saved') return
    setResult((prev) => ({ ...prev, loading: true, error: null }))
    jobs.saved({ limit: 50 })
      .then((response) => setResult({
        rows: response.data ?? [], meta: response.meta ?? null, loading: false, error: null,
      }))
      .catch((error) => setResult((prev) => ({ ...prev, loading: false, error })))
  }, [tab])

  async function toggleSave(job) {
    setBusyId(job.id)
    setNotice(null)
    try {
      if (job.isSaved) await jobs.unsave(job.id)
      else await jobs.save(job.id)
      if (tab === 'board') await load(clean(applied))
      else if (tab === 'saved') setResult((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== job.id) }))
    } catch (error) {
      setNotice({ tone: 'error', text: error.message })
    } finally {
      setBusyId(null)
    }
  }

  const visibleTabs = useMemo(
    () => TABS.filter(([value]) => value !== 'post' || canPost),
    [canPost],
  )

  if (routeView === 'job' || routeView === 'review' || routeView === 'company') {
    if (!id) return <Card><ErrorState error={new Error('Not found')} /></Card>
    if (routeView === 'job') {
      return <JobDetail jobId={id} onBack={() => navigate('/jobs')} />
    }
    if (routeView === 'company') {
      return <CompanyDetail companyId={id} onBack={() => navigate('/jobs')} />
    }
    return <PostJobReview jobId={id} onBack={() => navigate('/jobs')} />
  }

  return (
    <div className={STACK}>
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">05 &mdash; JOBS</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">JOBS</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Roles shared by alumni and staff across the network.
        </p>
      </header>

      {notice ? <Alert tone="error" onDismiss={() => setNotice(null)}>{notice.text}</Alert> : null}

      <nav className={ROW} role="tablist">
        {visibleTabs.map(([value, labelText]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={tabClass(tab === value)}
            onClick={() => {
              // Routed tabs own the URL; 'mine' and 'post' are local state, so
              // changing tab does not navigate away and reset them.
              if (ROUTED_TABS.has(value)) {
                setLocalTab(null)
                navigate(value === 'board' ? '/jobs' : `/jobs/${value}`)
              } else {
                setLocalTab(value)
              }
            }}
          >
            {labelText}
          </button>
        ))}
      </nav>

      {tab === 'board' ? (
        <>
          <Card>
            <form className={STACK} onSubmit={(e) => { e.preventDefault(); setApplied(filters) }}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Search">
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="Title, company or keyword"
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={filters.location}
                    onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                  />
                </Field>
                <Field label="Skill">
                  <Input
                    value={filters.skill}
                    onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))}
                    placeholder="React"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Work mode">
                  <Select
                    value={filters.workMode}
                    onChange={(e) => setFilters((f) => ({ ...f, workMode: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {WORK_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Type">
                  <Select
                    value={filters.employmentType}
                    onChange={(e) => setFilters((f) => ({ ...f, employmentType: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {EMPLOYMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Level">
                  <Select
                    value={filters.experienceLevel}
                    onChange={(e) => setFilters((f) => ({ ...f, experienceLevel: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Sort by">
                  <Select
                    value={filters.sort}
                    onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                  >
                    {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
              </div>
              <div className={ROW}>
                <Button type="submit">Apply filters</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS) }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </Card>

          {result.loading ? <Card><LoadingBlock rows={4} label="Loading jobs" /></Card> : null}
          {result.error ? <Card><ErrorState error={result.error} /></Card> : null}
          {!result.loading && result.rows.length === 0 ? (
            <Card>
              <EmptyState title="No jobs match" description="Try widening the filters." />
            </Card>
          ) : null}

          <div className={GRID}>
            {result.rows.map((job) => (
              <JobCard key={job.id} job={job} busy={busyId === job.id} onSave={toggleSave} />
            ))}
          </div>

          {result.meta ? (
            <Pagination
              meta={result.meta}
              onChange={(page) => load({ ...clean(applied), page })}
            />
          ) : null}
        </>
      ) : null}

      {tab === 'saved' ? (
        <div className={STACK}>
          {result.loading ? <Card><LoadingBlock rows={3} label="Loading saved jobs" /></Card> : null}
          {!result.loading && result.rows.length === 0 ? (
            <Card>
              <EmptyState
                title="No saved jobs"
                description="Save a role from the board to keep it here."
              />
            </Card>
          ) : null}
          <div className={GRID}>
            {result.rows.map((job) => (
              <JobCard key={job.id} job={job} busy={busyId === job.id} onSave={toggleSave} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'applications' ? <MyApplications /> : null}

      {tab === 'mine' ? (
        <div className={STACK}>
          {result.loading ? <Card><LoadingBlock rows={3} label="Loading your postings" /></Card> : null}
          {!result.loading && result.rows.length === 0 ? (
            <Card>
              <EmptyState
                title="You have not posted any jobs"
                description="Share a role with the network."
              />
            </Card>
          ) : null}
          {result.rows.map((job) => (
            <article key={job.id} className={FLUSH}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="block truncate font-semibold text-swiss-text hover:underline"
                  >
                    {job.title}
                  </Link>
                  <p className={cx('truncate', MUTED_SMALL)}>{job.companyName}</p>
                </div>
                <Badge tone={job.status === 'active' ? 'green' : 'slate'}>{job.status}</Badge>
              </div>
              <p className={cx('mt-2', MUTED_SMALL)}>
                {job.applicationCount} application{job.applicationCount === 1 ? '' : 's'}
              </p>
              <div className={cx(ROW, 'mt-3')}>
                <Link to={`/jobs/review/${job.id}`} className={LINK_BUTTON}>
                  View applicants
                </Link>
                <Link to={`/jobs/${job.id}`} className={LINK_BUTTON}>Preview</Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'post' ? (
        <PostJobForm
          onDone={() => {
            // Show the new posting immediately instead of reloading the board.
            setLocalTab('mine')
            setReloadKey((n) => n + 1)
            setNotice({ tone: 'success', text: 'Job posted. It is visible to your connections now.' })
          }}
        />
      ) : null}
    </div>
  )
}
