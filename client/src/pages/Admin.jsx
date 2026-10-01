import { useEffect, useState } from 'react'
import { admin, jobs, events, donations } from '../services/api.js'
import { ROLES, ROLE_LABELS } from '../utils/roles.js'
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field,
  Input, LoadingBlock, Select, Spinner, cx
} from '../components/ui.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Management' },
  { id: 'verification', label: 'Alumni Verification' },
  { id: 'jobs', label: 'Job Moderation' },
  { id: 'events', label: 'Event Management' },
  { id: 'donations', label: 'Donations Audit' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'audit_logs', label: 'Audit Logs' },
]

export default function Admin({ initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  // Data states
  const [metrics, setMetrics] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [jobsList, setJobsList] = useState([])
  const [eventsList, setEventsList] = useState([])
  const [donationsList, setDonationsList] = useState([])
  const [auditLogsList, setAuditLogsList] = useState([])

  // Filters
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')

  async function loadAdminData() {
    setLoading(true)
    setError(null)
    try {
      const [
        metricsRes,
        usersRes,
        jobsRes,
        eventsRes,
        donationsRes,
        logsRes,
      ] = await Promise.all([
        admin.metrics(),
        admin.users(),
        jobs.list({ includePending: true }),
        events.list({}),
        donations.all(),
        admin.auditLogs({}),
      ])

      setMetrics(metricsRes.data)
      setUsersList(usersRes.data || [])
      setJobsList(jobsRes.data || [])
      setEventsList(eventsRes.data || [])
      setDonationsList(donationsRes.data || [])
      setAuditLogsList(logsRes.data || [])
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  async function handleVerify(userId, approved) {
    setBusyId(userId)
    setMessage(null)
    try {
      const res = await admin.verify(userId, approved, approved ? 'Verified via Admin Panel' : 'Rejected via Admin Panel')
      setMessage({ tone: 'success', text: res.message })
      loadAdminData()
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  async function handleRoleChange(userId, newRole) {
    setBusyId(userId)
    try {
      const res = await admin.updateRole(userId, newRole)
      setMessage({ tone: 'success', text: res.message })
      loadAdminData()
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  async function handleJobModerate(jobId, action) {
    setBusyId(jobId)
    try {
      const res = await admin.moderateJob(jobId, action)
      setMessage({ tone: 'success', text: res.message })
      loadAdminData()
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const filteredUsers = usersList.filter((u) => {
    if (userRoleFilter !== 'all' && !u.roles?.includes(userRoleFilter)) return false
    if (userSearch) {
      const q = userSearch.toLowerCase()
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const pendingVerifications = usersList.filter((u) => u.roles?.includes(ROLES.ALUMNI) && !u.verified)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-swiss-border pb-6">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">
            ADMINISTRATION &mdash; SYSTEM CONSOLE
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-swiss-text">
            ADMIN PORTAL
          </h1>
          <p className="mt-2 text-sm text-swiss-muted max-w-2xl">
            Platform-wide identity verification, user governance, content moderation, donation audits, and system security telemetry.
          </p>
        </div>
      </header>

      {message && (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Card><LoadingBlock rows={8} label="Loading administrative console" /></Card>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={loadAdminData} /></Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Tabs Navigation Sidebar */}
          <nav className="w-full lg:w-60 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {TABS.map((tab) => {
              const count = tab.id === 'verification' ? pendingVerifications.length : null
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMessage(null); }}
                  className={cx(
                    'text-left px-3.5 py-2.5 text-xs font-mono font-medium rounded-sm transition-colors flex items-center justify-between uppercase tracking-wider',
                    activeTab === tab.id
                      ? 'bg-swiss-text text-swiss-base font-bold'
                      : 'text-swiss-muted hover:bg-swiss-surface hover:text-swiss-text'
                  )}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={cx(
                      'px-1.5 py-0.2 rounded-xs text-[9px] font-mono font-bold',
                      activeTab === tab.id ? 'bg-swiss-accent text-white' : 'bg-amber-500 text-black'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Main Tab Panels */}
          <div className="flex-1 w-full space-y-6 min-w-0">
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="p-5">
                    <p className="text-[10px] font-mono text-swiss-label uppercase tracking-widest">TOTAL USERS</p>
                    <p className="text-3xl font-bold text-swiss-text mt-2">{metrics?.totalUsers}</p>
                    <p className="text-[10px] font-mono text-swiss-muted mt-1">{metrics?.alumniCount} ALUMNI · {metrics?.studentCount} STUDENTS</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-[10px] font-mono text-swiss-label uppercase tracking-widest">PENDING VERIFICATIONS</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{pendingVerifications.length}</p>
                    <p className="text-[10px] font-mono text-swiss-muted mt-1">REQUIRING ACTION</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-[10px] font-mono text-swiss-label uppercase tracking-widest">ACTIVE JOB POSTINGS</p>
                    <p className="text-3xl font-bold text-swiss-text mt-2">{metrics?.activeJobs}</p>
                    <p className="text-[10px] font-mono text-swiss-muted mt-1">{metrics?.pendingJobs || 0} PENDING MODERATION</p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-[10px] font-mono text-swiss-label uppercase tracking-widest">TOTAL ENDOWMENTS</p>
                    <p className="text-3xl font-bold text-swiss-text mt-2">₹{((metrics?.totalDonations || 0) / 100000).toFixed(1)}L</p>
                    <p className="text-[10px] font-mono text-swiss-muted mt-1">TAX DEDUCTIBLE 80G</p>
                  </Card>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader title="DEPARTMENT ENROLLMENT" />
                    <div className="p-5 space-y-3">
                      {metrics?.departmentBreakdown?.map((d) => (
                        <div key={d.department} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-swiss-text">{d.department}</span>
                            <span className="text-swiss-label">{d.count} ({d.percentage}%)</span>
                          </div>
                          <div className="w-full bg-swiss-border h-1 rounded-xs overflow-hidden">
                            <div className="bg-swiss-text h-full" style={{ width: `${d.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="TOP ALUMNI EMPLOYERS" />
                    <div className="divide-y divide-swiss-border font-mono text-xs">
                      {metrics?.topHiringCompanies?.map((c) => (
                        <div key={c.company} className="p-4 flex items-center justify-between">
                          <span className="font-bold text-swiss-text">{c.company}</span>
                          <span className="text-swiss-label">{c.alumniCount} Alumni · {c.openJobs} Open Roles</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* 2. USER MANAGEMENT */}
            {activeTab === 'users' && (
              <Card>
                <div className="p-5 border-b border-swiss-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold font-mono uppercase tracking-wider text-swiss-text">
                    Network Accounts ({filteredUsers.length})
                  </h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="text-xs max-w-xs"
                    />
                    <Select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="text-xs w-36"
                    >
                      <option value="all">All Roles</option>
                      <option value={ROLES.ALUMNI}>Alumni</option>
                      <option value={ROLES.STUDENT}>Students</option>
                      <option value={ROLES.PROFESSOR}>Professors</option>
                      <option value={ROLES.ADMIN}>Admins</option>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-swiss-border bg-swiss-surface text-swiss-label uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Name & Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Department / Year</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-swiss-border text-swiss-text">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-swiss-surface-hover transition-colors">
                          <td className="p-4 font-sans">
                            <p className="font-bold text-sm text-swiss-text">{u.name}</p>
                            <p className="text-xs font-mono text-swiss-label">{u.email}</p>
                          </td>
                          <td className="p-4">
                            <Badge tone={u.roles?.includes(ROLES.ALUMNI) ? 'green' : u.roles?.includes(ROLES.PROFESSOR) ? 'purple' : u.roles?.includes(ROLES.ADMIN) ? 'amber' : 'blue'}>
                              {u.roles?.[0] || 'USER'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {u.department} · {u.graduationYear || 'N/A'}
                          </td>
                          <td className="p-4">
                            {u.verified ? (
                              <Badge tone="green">&check; VERIFIED</Badge>
                            ) : (
                              <Badge tone="amber">PENDING</Badge>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Select
                              defaultValue={u.roles?.[0]}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="text-[11px] py-1 px-2 h-7 w-28 inline-block"
                              disabled={busyId === u.id}
                            >
                              <option value={ROLES.STUDENT}>Student</option>
                              <option value={ROLES.ALUMNI}>Alumni</option>
                              <option value={ROLES.PROFESSOR}>Professor</option>
                              <option value={ROLES.ADMIN}>Admin</option>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 3. ALUMNI VERIFICATION */}
            {activeTab === 'verification' && (
              <Card>
                <CardHeader
                  title="PENDING ALUMNI VERIFICATION QUEUE"
                  description="Cross-reference graduation records before granting official verified badge"
                />
                <div className="p-5">
                  {pendingVerifications.length === 0 ? (
                    <EmptyState
                      title="QUEUE EMPTY"
                      description="No alumni verification requests are currently pending review."
                    />
                  ) : (
                    <div className="space-y-4">
                      {pendingVerifications.map((u) => (
                        <div key={u.id} className="p-5 border border-swiss-border bg-swiss-surface rounded-sm flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-swiss-text">{u.name}</h3>
                              <Badge tone="amber">AWAITING VERIFICATION</Badge>
                            </div>
                            <p className="text-xs text-swiss-muted mt-1 font-mono">
                              Email: {u.email} · Dept: {u.department} · Graduation Year: {u.graduationYear}
                            </p>
                            <p className="text-xs text-swiss-text mt-1 font-mono">
                              Current Role: {u.headline || 'Software Engineer'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={busyId === u.id}
                              onClick={() => handleVerify(u.id, true)}
                            >
                              {busyId === u.id ? <Spinner /> : 'APPROVE & VERIFY'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === u.id}
                              onClick={() => handleVerify(u.id, false)}
                            >
                              REJECT
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 4. JOB MODERATION */}
            {activeTab === 'jobs' && (
              <Card>
                <CardHeader
                  title="JOB BOARD MODERATION QUEUE"
                  description="Inspect posted opportunities to enforce safety and policy compliance"
                />
                <div className="divide-y divide-swiss-border">
                  {jobsList.map((job) => (
                    <div key={job.id} className="p-5 flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-swiss-text">{job.title}</span>
                          <Badge tone={job.moderationStatus === 'pending' ? 'amber' : job.moderationStatus === 'flagged' ? 'red' : 'green'}>
                            {job.moderationStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-swiss-muted font-mono">{job.companyName} · {job.location} · {job.salaryCurrency} {job.salaryMin?.toLocaleString()} - {job.salaryMax?.toLocaleString()}</p>
                        <p className="text-xs text-swiss-text mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                        <p className="text-[10px] font-mono text-swiss-label mt-1">Posted by: {job.postedBy?.name || 'User'}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {job.moderationStatus !== 'approved' && (
                          <Button size="sm" onClick={() => handleJobModerate(job.id, 'approve')} disabled={busyId === job.id}>
                            APPROVE
                          </Button>
                        )}
                        {job.moderationStatus !== 'flagged' && (
                          <Button size="sm" variant="secondary" onClick={() => handleJobModerate(job.id, 'flag')} disabled={busyId === job.id}>
                            FLAG
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleJobModerate(job.id, 'reject')} disabled={busyId === job.id}>
                          REJECT
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 5. EVENT MANAGEMENT */}
            {activeTab === 'events' && (
              <Card>
                <CardHeader
                  title="CAMPUS & ALUMNI EVENTS ROSTER"
                  description="Global calendar scheduling and RSVP attendance logs"
                />
                <div className="divide-y divide-swiss-border">
                  {eventsList.map((e) => (
                    <div key={e.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-swiss-text">{e.title}</span>
                          <Badge tone="blue">{e.categoryLabel || e.category}</Badge>
                        </div>
                        <p className="text-xs text-swiss-muted font-mono mt-1">
                          Date: {e.date} at {e.time} · {e.location}
                        </p>
                        <p className="text-xs font-mono text-swiss-label mt-0.5">
                          {e.attendeesCount || 0} RSVPs confirmed of {e.capacity} capacity
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => alert(`Attendees registered: ${(e.rsvpUsers || []).join(', ')}`)}>
                          VIEW ROSTER
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 6. DONATIONS AUDIT */}
            {activeTab === 'donations' && (
              <Card>
                <CardHeader
                  title="ENDOWMENT CONTRIBUTIONS & 80G LEDGER"
                  description="Financial gift audits and Section 80G tax receipt records"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-swiss-border bg-swiss-surface text-swiss-label uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Receipt #</th>
                        <th className="p-4">Donor</th>
                        <th className="p-4">Endowment Fund</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Tax Cert</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-swiss-border text-swiss-text">
                      {donationsList.map((d) => (
                        <tr key={d.id} className="hover:bg-swiss-surface-hover transition-colors">
                          <td className="p-4 font-bold">{d.receiptNumber}</td>
                          <td className="p-4 font-sans">{d.donorName}</td>
                          <td className="p-4 truncate max-w-xs">{d.fundName}</td>
                          <td className="p-4 font-bold text-emerald-600">₹{d.amount.toLocaleString()}</td>
                          <td className="p-4">{d.taxExemption80G}</td>
                          <td className="p-4 text-swiss-label">{new Date(d.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 7. ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <Card className="p-6 space-y-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-swiss-label">PLATFORM USER GROWTH (LAST 6 MONTHS)</h3>
                  <div className="grid grid-cols-6 gap-2 text-center font-mono text-xs pt-4">
                    {metrics?.userGrowth?.map((g) => (
                      <div key={g.month} className="space-y-2">
                        <div className="h-28 bg-swiss-surface border border-swiss-border rounded-sm flex items-end justify-center p-1">
                          <div
                            className="bg-swiss-text w-full rounded-xs transition-all duration-500"
                            style={{ height: `${Math.round((g.total / 1500) * 100)}%` }}
                          />
                        </div>
                        <p className="font-bold text-swiss-text">{g.month}</p>
                        <p className="text-[10px] text-swiss-label">{g.total}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-swiss-label">ENGAGEMENT TELEMETRY</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-center">
                    <div className="p-4 border border-swiss-border bg-swiss-surface rounded-sm">
                      <p className="text-2xl font-bold text-swiss-text">{metrics?.activeMentorships || 78}</p>
                      <p className="text-[10px] text-swiss-label uppercase mt-1">Active Mentorships</p>
                    </div>
                    <div className="p-4 border border-swiss-border bg-swiss-surface rounded-sm">
                      <p className="text-2xl font-bold text-swiss-text">164</p>
                      <p className="text-[10px] text-swiss-label uppercase mt-1">Applications / Mo</p>
                    </div>
                    <div className="p-4 border border-swiss-border bg-swiss-surface rounded-sm">
                      <p className="text-2xl font-bold text-swiss-text">1,420</p>
                      <p className="text-[10px] text-swiss-label uppercase mt-1">Messages Sent</p>
                    </div>
                    <div className="p-4 border border-swiss-border bg-swiss-surface rounded-sm">
                      <p className="text-2xl font-bold text-swiss-text">4.8 / 5.0</p>
                      <p className="text-[10px] text-swiss-label uppercase mt-1">Mentor Rating</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 8. AUDIT LOGS */}
            {activeTab === 'audit_logs' && (
              <Card>
                <CardHeader
                  title="IMMUTABLE SECURITY & ADMINISTRATIVE AUDIT LOG"
                  description="Chronological record of privileged system actions and status changes"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-swiss-border bg-swiss-surface text-swiss-label uppercase tracking-widest">
                      <tr>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Actor</th>
                        <th className="p-4">Resource</th>
                        <th className="p-4">IP Address</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-swiss-border text-swiss-text">
                      {auditLogsList.map((log) => (
                        <tr key={log.id} className="hover:bg-swiss-surface-hover transition-colors">
                          <td className="p-4 text-swiss-label">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="p-4 font-bold">{log.action}</td>
                          <td className="p-4 font-sans">{log.userName} ({log.userRole})</td>
                          <td className="p-4 truncate max-w-xs">{log.resource}</td>
                          <td className="p-4">{log.ipAddress}</td>
                          <td className="p-4">
                            <Badge tone={log.status === 'SUCCESS' ? 'green' : log.status === 'FLAGGED' ? 'amber' : 'red'}>
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
