import { Link, NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { path: '/', label: 'Home', end: true },
  { path: '/login', label: 'Login' },
  { path: '/register', label: 'Register' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/directory', label: 'Directory' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/events', label: 'Events' },
  { path: '/mentorship', label: 'Mentorship' },
  { path: '/messages', label: 'Messages' },
  { path: '/admin', label: 'Admin' },
]

function navClass({ isActive }) {
  return [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
  ].join(' ')
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Alumni Network Portal
          </Link>
          <nav className="flex flex-wrap gap-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end ?? false}
                className={navClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
          Alumni Network Portal - foundation build.
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
