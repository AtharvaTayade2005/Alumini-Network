import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar, Button, cx } from '../components/ui.jsx'

const PUBLIC_LINKS = [{ to: '/', label: 'Home', end: true }]

const MEMBER_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/directory', label: 'Directory' },
  { to: '/messages', label: 'Messages' },
  { to: '/notifications', label: 'Notifications', badge: 'unread' },
  { to: '/profile', label: 'My profile' },
]

const PLANNED_LINKS = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/events', label: 'Events' },
  { to: '/mentorship', label: 'Mentorship' },
]

function navClass({ isActive }) {
  return cx(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  )
}

export default function AppLayout() {
  const { isAuthenticated, user, logout, unreadCount, isStaff } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const links = isAuthenticated
    ? [...MEMBER_LINKS, ...(isStaff ? [{ to: '/admin', label: 'Admin' }] : []), ...PLANNED_LINKS]
    : PUBLIC_LINKS

  async function handleLogout() {
    setSigningOut(true)
    await logout()
    setSigningOut(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="shrink-0 text-base font-bold tracking-tight">
            Alumni Network
          </Link>

          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end ?? false} className={navClass}>
                {link.label}
                {link.badge && unreadCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100"
              >
                <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
                <span className="hidden text-sm font-medium sm:inline">
                  {user?.name?.split(' ')[0]}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                disabled={signingOut}
                onClick={handleLogout}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Join</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
          Alumni Network Portal. Directory, connections, messaging and
          notifications are live; jobs, events, mentorship and donations are
          still in progress.
        </div>
      </footer>
    </div>
  )
}
