import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { notifications } from '../services/api.js'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingBlock, cx } from '../components/ui.jsx'

/** Notification types the notification service can actually emit today. */
const TONES = {
  connection_request: 'blue',
  connection_accepted: 'green',
  new_message: 'purple',
  admin_notice: 'amber',
  verification_result: 'blue',
}

function timeAgo(value) {
  if (!value) return ''
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(value).toLocaleDateString()
}

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['connection_request', 'Connection requests'],
  ['connection_accepted', 'Connections'],
  ['new_message', 'Messages'],
]

export default function Notifications() {
  const [state, setState] = useState({ loading: true, rows: [], error: null, unread: 0 })
  const [filter, setFilter] = useState('all')
  const [pendingId, setPendingId] = useState(null)

  const load = useCallback(async (query) => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      const response = await notifications.list({ limit: 50, ...query })
      setState({
        loading: false,
        rows: response.data ?? [],
        error: null,
        unread: response.meta?.unread ?? 0,
      })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    load(filter === 'all' ? {} : { unreadOnly: filter === 'unread', type: filter === 'unread' ? undefined : filter })
  }, [filter, load])

  const visible = state.rows
  const hasUnread = state.unread > 0

  async function markRead(id) {
    setPendingId(id)
    try {
      await notifications.markRead(id)
      setState((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        rows: prev.rows.map((row) => (row.id === id ? { ...row, is_read: true } : row)),
      }))
    } finally {
      setPendingId(null)
    }
  }

  async function markAllRead() {
    await notifications.markAllRead()
    setState((prev) => ({
      ...prev,
      unread: 0,
      rows: prev.rows.map((row) => ({ ...row, is_read: true })),
    }))
  }

  async function dismiss(id) {
    setPendingId(id)
    try {
      await notifications.remove(id)
      setState((prev) => ({
        ...prev,
        rows: prev.rows.filter((row) => row.id !== id),
      }))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">
            {hasUnread
              ? `${state.unread} unread notification${state.unread === 1 ? '' : 's'}`
              : 'You are all caught up.'}
          </p>
        </div>
        {hasUnread ? (
          <Button variant="secondary" onClick={markAllRead}>Mark all as read</Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {state.loading ? (
          <LoadingBlock rows={5} />
        ) : state.error ? (
          <ErrorState error={state.error} onRetry={() => load({})} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'No notifications' : 'Nothing in this filter'}
            description={filter === 'all'
              ? 'Connection requests and new messages will appear here.'
              : 'Try a different filter.'}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((row) => (
              <li
                key={row.id}
                className={cx('flex items-start gap-3 px-5 py-4', !row.is_read && 'bg-blue-50/40')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!row.is_read ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
                        title="Unread"
                      />
                    ) : null}
                    <p className="text-sm font-medium text-slate-900">{row.title}</p>
                    <Badge tone={TONES[row.type] ?? 'slate'}>
                      {row.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {row.body ? (
                    <p className="mt-1 text-sm text-slate-600">{row.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">{timeAgo(row.created_at)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {row.link ? (
                    <Link to={row.link}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  ) : null}
                  {!row.is_read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === row.id}
                      onClick={() => markRead(row.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === row.id}
                    onClick={() => dismiss(row.id)}
                    aria-label="Delete notification"
                  >
                    &times;
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
