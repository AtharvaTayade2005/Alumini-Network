import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { canAccessRoute } from '../utils/permissions.js'
import { Spinner } from '../components/ui.jsx'

function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-mono text-xs uppercase text-swiss-label" role="status">
      <span className="flex items-center gap-2">
        <Spinner /> Checking session credentials
      </span>
    </div>
  )
}

/** Requires a signed-in user; remembers where they were headed. */
export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

/** Keeps signed-in users away from the login/register screens. */
export function RequireAnonymous({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

/** Checks route permission based on role. Redirects to /403 if unauthorized. */
export function RequireRoleAccess({ children }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!canAccessRoute(user, location.pathname)) {
    return <Navigate to="/403" replace state={{ attempted: location.pathname }} />
  }

  return children
}

/** Legacy helper for admin/staff routes */
export function RequireStaff({ children }) {
  const { isStaff, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isStaff) {
    return <Navigate to="/403" replace state={{ attempted: location.pathname }} />
  }
  return children
}
