import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Card, CardHeader } from '../components/ui.jsx'

const FEATURES = [
  {
    title: 'Find your people',
    body: 'Search verified alumni and students by skill, industry, batch and location, then send a connection request.',
  },
  {
    title: 'Keep in touch',
    body: 'Message your connections in real time and see when they are online. Read receipts keep everyone in sync.',
  },
  {
    title: 'Stay up to date',
    body: 'Connection requests, accepted invitations and new messages land in your notifications feed.',
  },
  {
    title: 'Control your data',
    body: 'Every member decides what the directory exposes: email, phone, location, employer and directory visibility.',
  },
]

const ROADMAP = [
  { label: 'Profiles, directory, connections, messaging, notifications', state: 'Live' },
  { label: 'Job board and applications', state: 'In progress' },
  { label: 'Mentorship matching', state: 'In progress' },
  { label: 'Events and RSVPs', state: 'In progress' },
  { label: 'Donations and payments', state: 'In progress' },
]

const STATE_TONES = {
  Live: 'green',
  'In progress': 'slate',
}

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="space-y-16">
      <section className="py-10">
        <Badge />
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          The network that keeps your
          {' '}
          <span className="text-blue-700">campus community</span> together.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Reunite with classmates, discover alumni working in your field, and
          exchange opportunities with people who already know how the place works.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button size="lg">Go to dashboard</Button>
              </Link>
              <Link to="/directory">
                <Button variant="secondary" size="lg">Browse the directory</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg">Create your account</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader title={feature.title} description={feature.body} />
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Build status</h2>
        <p className="mt-1 text-sm text-slate-600">
          This portal is being built in phases. Here is exactly where it stands.
        </p>
        <Card className="mt-4 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {ROADMAP.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-slate-800">{item.label}</span>
                <Badge tone={STATE_TONES[item.state]}>{item.state}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}

function Badge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
      Verification, privacy and moderation built in
    </span>
  )
}
