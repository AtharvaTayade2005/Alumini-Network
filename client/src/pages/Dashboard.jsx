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
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </>
  )
  return to ? (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Here is what is happening in your network.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile">
            <Button variant="secondary">Edit profile</Button>
          </Link>
          <Link to="/directory">
            <Button>Find alumni</Button>
          </Link>
        </div>
      </header>

      {state.error ? (
        <Card><ErrorState error={state.error} onRetry={load} /></Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Your profile"
            description="Keep this current so people can find you."
            actions={(
              <Link to="/profile" className="text-sm font-medium text-slate-900 underline underline-offset-2">
                Edit
              </Link>
            )}
          />
          {state.loading ? (
            <LoadingBlock />
          ) : !data.profile ? null : (
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-slate-600">{user?.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
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

              <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
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

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Connection requests"
              actions={data.pending.length ? <Badge tone="blue">{data.pending.length}</Badge> : null}
            />
            {state.loading ? (
              <LoadingBlock rows={2} />
            ) : data.pending.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="Requests from other members will appear here."
                action={(
                  <Link to="/directory">
                    <Button variant="secondary" size="sm">Browse directory</Button>
                  </Link>
                )}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.pending.slice(0, 5).map((request) => (
                  <li key={request.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={request.peer?.name} src={request.peer?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {request.peer?.name ?? 'Unknown member'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {request.direction === 'incoming'
                          ? 'Wants to connect'
                          : 'Awaiting reply'}
                      </p>
                    </div>
                    {request.direction === 'incoming' ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => respond(request.id, 'accept')}
                          disabled={busyId === request.id}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => respond(request.id, 'decline')}
                          disabled={busyId === request.id}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent notifications"
              actions={(
                <Link to="/notifications" className="text-sm font-medium text-slate-900 underline underline-offset-2">
                  View all
                </Link>
              )}
            />
            {state.loading ? (
              <LoadingBlock rows={2} />
            ) : data.recent.length === 0 ? (
              <EmptyState title="Nothing yet" description="You are all caught up." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recent.map((item) => (
                  <li key={item.id} className="px-5 py-3">
                    <p className="text-sm text-slate-900">{item.title ?? item.type.replace(/_/g, ' ')}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
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
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value || <span className="text-slate-400">Not set</span>}</dd>
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
