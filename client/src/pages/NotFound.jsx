import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui.jsx'

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <div className="px-6 py-12 text-center">
        <p className="text-5xl font-semibold text-swiss-text">404</p>
        <h1 className="mt-3 text-lg font-semibold text-swiss-text">Page not found</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          That page does not exist or you no longer have access to it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/"><Button variant="secondary">Go home</Button></Link>
          <Link to="/dashboard"><Button>Dashboard</Button></Link>
        </div>
      </div>
    </Card>
  )
}
