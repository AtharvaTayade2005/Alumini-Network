import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../components/ui.jsx'

/**
 * Shown for features whose database tables exist but whose API routes are not
 * implemented yet. Rendered intentionally so the UI never implies a working
 * feature that the backend cannot serve.
 */
export default function ComingSoon({ title, description, planned }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-swiss-text">{title}</h1>
        <p className="mt-1 text-sm text-swiss-muted">{description}</p>
      </header>

      <Card>
        <CardHeader title="Not available yet" />
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-swiss-muted">
            The data model for this feature is already in place, but the server
            routes that power it are still being built. Nothing here is wired to
            a live API yet, so the page is read-only.
          </p>
          {planned?.length ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-swiss-muted">
              {planned.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          <p className="text-sm text-swiss-muted">
            In the meantime, the{' '}
            <Link to="/directory" className="font-medium text-blue-700 underline underline-offset-2">
              directory
            </Link>{' '}
            and{' '}
            <Link to="/messages" className="font-medium text-blue-700 underline underline-offset-2">
              messaging
            </Link>{' '}
            are fully working.
          </p>
        </div>
      </Card>
    </div>
  )
}
