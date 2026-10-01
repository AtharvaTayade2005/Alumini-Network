import { Link } from 'react-router-dom'
import { Card, Button } from '../components/ui.jsx'

export function Forbidden() {
  return (
    <Card className="mx-auto max-w-lg mt-12">
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">ERROR 403</p>
        <p className="text-5xl font-bold tracking-tight text-swiss-text">Access Denied</p>
        <p className="mt-4 text-sm text-swiss-muted">
          You do not have the required permissions to view this page. This area might be restricted to administrators or alumni.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/"><Button variant="secondary">Go Home</Button></Link>
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
        </div>
      </div>
    </Card>
  )
}

export function Unauthorized() {
  return (
    <Card className="mx-auto max-w-lg mt-12">
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">ERROR 401</p>
        <p className="text-5xl font-bold tracking-tight text-swiss-text">Unauthorized</p>
        <p className="mt-4 text-sm text-swiss-muted">
          Please log in to access this feature.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/login"><Button>Log In</Button></Link>
        </div>
      </div>
    </Card>
  )
}

export function ServerError() {
  return (
    <Card className="mx-auto max-w-lg mt-12">
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">ERROR 500</p>
        <p className="text-5xl font-bold tracking-tight text-swiss-text">Server Error</p>
        <p className="mt-4 text-sm text-swiss-muted">
          Something went wrong on our end. We're looking into it. Please try again later.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    </Card>
  )
}

export function Offline() {
  return (
    <Card className="mx-auto max-w-lg mt-12 border-orange-500/30">
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-[10px] tracking-widest text-orange-500 uppercase mb-2">NETWORK OFFLINE</p>
        <p className="text-5xl font-bold tracking-tight text-swiss-text">No Connection</p>
        <p className="mt-4 text-sm text-swiss-muted">
          You appear to be offline. Please check your internet connection and try again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      </div>
    </Card>
  )
}

export function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-swiss-base text-swiss-text p-4">
      <Card className="max-w-lg w-full">
        <div className="px-6 py-12 text-center">
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">SYSTEM UPDATE</p>
          <p className="text-4xl font-bold tracking-tight text-swiss-text">Scheduled Maintenance</p>
          <p className="mt-4 text-sm text-swiss-muted">
            The Alumni Network is currently undergoing scheduled maintenance to improve performance and add new features. We will be back online shortly.
          </p>
        </div>
      </Card>
    </div>
  )
}
