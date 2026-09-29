import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Spinner } from '../components/ui.jsx'

function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <Spinner /> Checking your session
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

/** Requires an admin or moderator role. */
export function RequireStaff({ children }) {
  const { isAuthenticated, isLoading, isStaff } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!isStaff) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">Not permitted</h2>
        <p className="mt-1 text-sm text-amber-800">
          This area is restricted to administrators and moderators.
        </p>
      </section>
    )
  }
  return children
}
