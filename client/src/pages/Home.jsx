import { Link } from 'react-router-dom'

const modules = [
  { path: '/directory', label: 'Alumni Directory', detail: 'Search and filter verified alumni profiles.' },
  { path: '/mentorship', label: 'Mentorship', detail: 'One-to-one mentor and mentee matching.' },
  { path: '/jobs', label: 'Jobs & Internships', detail: 'Postings, applications and referrals.' },
  { path: '/events', label: 'Events & Reunions', detail: 'RSVPs, schedules and reminders.' },
  { path: '/messages', label: 'Real-Time Messaging', detail: 'Direct conversations between members.' },
  { path: '/admin', label: 'Admin Dashboard', detail: 'Moderation, analytics and audit logs.' },
]

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-slate-900 px-6 py-14 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
          Alumni Network Portal
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
          One portal for alumni, students and university administrators.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          This build contains the project foundation only. Each module below is a
          placeholder route and will be implemented incrementally.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Register
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Planned modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <h3 className="font-semibold">{module.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{module.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
