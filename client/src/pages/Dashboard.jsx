import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { connections, notifications, profiles } from '../services/api.js'
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingBlock,
} from '../components/ui.jsx'

function StatTile({ label, value, hint, to }) {
  const body = (
    <>
      <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-swiss-text">{value}</p>
      {hint ? <p className="mt-1 font-mono text-[10px] text-swiss-muted uppercase">{hint}</p> : null}
    </>
  )
  return to ? (
    <Link
      to={to}
      className="rounded-sm border border-swiss-border bg-swiss-surface p-5 transition-colors hover:bg-[var(--color-swiss-surface-hover)]"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-sm border border-swiss-border bg-swiss-surface p-5">
      {body}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, error: null })
  const [busyId, setBusyId] = useState(null)
  const [data, setData] = useState({
    profile: null, stats: null, unread: 0, recent: [], pending: [],
  })

  async function load() {
    setState({ loading: true, error: null })
    try {
      // Independent reads, so a slow one should not hold up the rest.
      const [profile, stats, unread, recent, pending] = await Promise.all([
        profiles.me(),
        connections.stats(),
        notifications.unreadCount(),
        notifications.list({ limit: 5 }),
        connections.pending(),
      ])
      setData({
        profile: profile.data,
        stats: stats.data,
        unread: unread.data?.unread ?? 0,
        recent: recent.data ?? [],
        pending: pending.data ?? [],
      })
      setState({ loading: false, error: null })
    } catch (error) {
      setState({ loading: false, error })
    }
  }

  useEffect(() => { load() }, [])

  async function respond(connectionId, action) {
    setBusyId(connectionId)
    try {
      await connections.respond(connectionId, action)
      await load()
    } catch (error) {
      setState((prev) => ({ ...prev, error }))
    } finally {
      setBusyId(null)
    }
  }

  const { alumni, student } = data.profile ?? {}
  const roleProfile = alumni ?? student ?? {}
  const completion = profileCompletion(data.profile)

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">01 &mdash; DASHBOARD</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-swiss-text">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}.
          </h1>
          <p className="mt-3 max-w-xl text-swiss-muted leading-relaxed">
            Here is what is happening in your network.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/profile">
            <Button variant="secondary">EDIT PROFILE</Button>
          </Link>
          <Link to="/directory">
            <Button>FIND ALUMNI &rarr;</Button>
          </Link>
        </div>
      </header>

      {state.error ? (
        <Card><ErrorState error={state.error} onRetry={load} /></Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 rounded-sm border border-swiss-border bg-swiss-surface" />
          ))
        ) : (
          <>
            <StatTile
              label="Connections"
              value={data.stats?.connections ?? 0}
              to="/messages"
            />
            <StatTile
              label="Pending requests"
              value={data.stats?.pending_received ?? 0}
              hint={data.stats?.pending_sent
                ? `${data.stats.pending_sent} sent`
                : undefined}
              to="/directory"
            />
            <StatTile label="Unread messages" value={data.unread} to="/messages" />
            <StatTile
              label="Profile complete"
              value={`${completion}%`}
              hint={completion < 100 ? 'Add more detail' : 'All set'}
              to="/profile"
            />
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2 border border-swiss-border rounded-sm bg-swiss-surface">
          <CardHeader
            title="YOUR PROFILE"
            description="Keep this current so people can find you."
            actions={(
              <Link to="/profile" className="font-mono text-[10px] tracking-widest text-swiss-label uppercase hover:text-swiss-text">
                EDIT &rarr;
              </Link>
            )}
          />
          {state.loading ? (
            <LoadingBlock />
          ) : !data.profile ? null : (
            <div className="px-5 py-6">
              <div className="flex items-start gap-5">
                <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold tracking-tight text-swiss-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm font-mono text-swiss-muted mt-1">{user?.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(user?.roles ?? []).map((role) => (
                      <Badge key={role} tone="blue">{role}</Badge>
                    ))}
                    {alumni?.verification_status ? (
                      <Badge tone={alumni.verification_status === 'verified' ? 'green' : 'amber'}>
                        {alumni.verification_status}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 border-t border-swiss-border pt-6">
                <Detail label="Role" value={alumni ? 'Alumni' : student ? 'Student' : 'Member'} />
                <Detail label="Graduation year" value={roleProfile.graduation_year ?? roleProfile.year_of_study} />
                <Detail label="Current company" value={roleProfile.current_company} />
                <Detail label="Position" value={roleProfile.current_position} />
                <Detail label="Degree" value={roleProfile.degree} />
                <Detail label="Industry" value={roleProfile.industry} />
                <Detail label="Location" value={[roleProfile.city, roleProfile.country].filter(Boolean).join(', ')} />
                <Detail
                  label="Skills"
                  value={data.profile.skills?.length
                    ? data.profile.skills.map((skill) => skill.name).join(', ')
                    : null}
                />
              </dl>
            </div>
          )}
        </Card>

        <div className="space-y-8">
          <Card className="border border-swiss-border rounded-sm bg-swiss-surface">
            <CardHeader
              title="CONNECTION REQUESTS"
              actions={data.pending.length ? <Badge tone="blue">{data.pending.length}</Badge> : null}
            />
            {state.loading ? (
              <LoadingBlock rows={2} />
            ) : data.pending.length === 0 ? (
              <EmptyState
                title="NO PENDING REQUESTS"
                description="Requests from other members will appear here."
                action={(
                  <Link to="/directory">
                    <Button variant="secondary" size="sm">BROWSE DIRECTORY</Button>
                  </Link>
                )}
              />
            ) : (
              <ul className="divide-y divide-swiss-border">
                {data.pending.slice(0, 5).map((request) => (
                  <li key={request.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar name={request.peer?.name} src={request.peer?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-swiss-text">
                        {request.peer?.name ?? 'Unknown member'}
                      </p>
                      <p className="truncate font-mono text-[10px] text-swiss-muted mt-1 uppercase">
                        {request.direction === 'incoming'
                          ? 'WANTS TO CONNECT'
                          : 'AWAITING REPLY'}
                      </p>
                    </div>
                    {request.direction === 'incoming' ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          onClick={() => respond(request.id, 'accept')}
                          disabled={busyId === request.id}
                        >
                          ACCEPT
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => respond(request.id, 'decline')}
                          disabled={busyId === request.id}
                        >
                          DECLINE
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border border-swiss-border rounded-sm bg-swiss-surface">
            <CardHeader
              title="RECENT NOTIFICATIONS"
              actions={(
                <Link to="/notifications" className="font-mono text-[10px] tracking-widest text-swiss-label uppercase hover:text-swiss-text">
                  VIEW ALL &rarr;
                </Link>
              )}
            />
            {state.loading ? (
              <LoadingBlock rows={2} />
            ) : data.recent.length === 0 ? (
              <EmptyState title="NOTHING YET" description="You are all caught up." />
            ) : (
              <ul className="divide-y divide-swiss-border">
                {data.recent.map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <p className="text-sm font-semibold text-swiss-text">{item.title ?? item.type.replace(/_/g, ' ')}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-swiss-muted">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-widest text-swiss-label uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-swiss-text">{value || <span className="text-swiss-muted">Not set</span>}</dd>
    </div>
  )
}

/** Cheap completeness heuristic so the dashboard can nudge the user. */
function profileCompletion(profile) {
  if (!profile) return 0
  const alumni = profile.alumni ?? profile.student ?? {}
  const checks = [
    alumni.bio, alumni.current_company, alumni.current_position, alumni.industry,
    profile.skills?.length ? 'skills' : null,
    profile.education?.length ? 'education' : null,
    alumni.city, profile.privacy?.show_email ? 'email' : null,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
