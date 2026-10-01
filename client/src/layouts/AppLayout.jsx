import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar, Button, cx } from '../components/ui.jsx'

const PUBLIC_LINKS = [{ to: '/', label: 'Home', end: true }]

const MEMBER_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/directory', label: 'Directory' },
  { to: '/events', label: 'Events' },
  { to: '/messages', label: 'Messages' },
  { to: '/notifications', label: 'Notifications', badge: 'unread' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/mentorship', label: 'Mentorship' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
]

const AI_LINKS = [
  { to: '/assistant', label: 'Assistant' },
  { to: '/resume-analyzer', label: 'Resume AI' },
  { to: '/job-readiness', label: 'Readiness' },
  { to: '/semantic-search', label: 'AI Search' },
]

const PLANNED_LINKS = []

function navClass({ isActive }) {
  return cx(
    'block rounded-sm px-3 py-2 text-sm font-medium transition-colors font-mono uppercase text-xs',
    isActive
      ? 'bg-swiss-text text-swiss-base'
      : 'text-swiss-muted hover:bg-[var(--color-swiss-surface-hover)] hover:text-swiss-text',
  )
}

function MenuIcon({ isOpen }) {
  return (
    <svg className="w-5 h-5 text-swiss-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {isOpen ? (
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  )
}

export default function AppLayout() {
  const { isAuthenticated, user, logout, unreadCount, isStaff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isHome = location.pathname === '/'

  const links = isAuthenticated
    ? [...MEMBER_LINKS, ...AI_LINKS, ...(isStaff ? [{ to: '/admin', label: 'Admin' }] : []), ...PLANNED_LINKS]
    : PUBLIC_LINKS

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    setSigningOut(true)
    await logout()
    setSigningOut(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-swiss-base text-swiss-text">
      <header className="sticky top-0 z-50 border-b border-swiss-border bg-swiss-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="shrink-0 text-base font-bold tracking-tight">
            ALUMNI NETWORK
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-1 flex-wrap justify-end items-center gap-1 ml-4 mr-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end ?? false} className={navClass}>
                {link.label}
                {link.badge && unreadCount > 0 ? (
                  <span className="ml-1.5 rounded-sm bg-swiss-accent px-1.5 py-0.5 text-[10px] font-semibold text-swiss-base">
                    {unreadCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="hidden md:flex shrink-0 items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-[var(--color-swiss-surface-hover)]"
                >
                  <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
                  <span className="text-sm font-medium">
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
              <div className="hidden md:flex shrink-0 items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Join</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="md:hidden p-2 rounded-sm border border-swiss-border hover:bg-[var(--color-swiss-surface-hover)] transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <MenuIcon isOpen={mobileMenuOpen} />
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div className="md:hidden border-t border-swiss-border bg-swiss-surface px-4 py-4 space-y-2">
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end ?? false} className={navClass}>
                  {link.label}
                  {link.badge && unreadCount > 0 ? (
                    <span className="ml-1.5 rounded-sm bg-swiss-accent px-1.5 py-0.5 text-[10px] font-semibold text-swiss-base">
                      {unreadCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </nav>
            {isAuthenticated ? (
              <div className="mt-4 pt-4 border-t border-swiss-border flex flex-col gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-sm px-3 py-2 hover:bg-[var(--color-swiss-surface-hover)]"
                >
                  <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
                  <span className="text-sm font-medium">
                    {user?.name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  disabled={signingOut}
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-swiss-border flex flex-col gap-2">
                <Link to="/login" className="w-full">
                  <Button variant="ghost" className="w-full justify-start">Sign in</Button>
                </Link>
                <Link to="/register" className="w-full">
                  <Button className="w-full justify-start">Join</Button>
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </header>

      <main className={cx("mx-auto w-full max-w-6xl flex-1", !isHome && "px-4 py-8")}>
        <Outlet />
      </main>

      {!isHome && (
        <footer className="border-t border-swiss-border bg-swiss-base mt-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 text-[10px] uppercase font-mono tracking-widest text-swiss-label">
            Alumni Network Portal. Directory, connections, messaging,
            mentorship and the job board are live; events and donations are
            still in progress.
          </div>
        </footer>
      )}
    </div>
  )
}
