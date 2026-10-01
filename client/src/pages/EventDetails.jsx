import { Link } from 'react-router-dom'
import { Card, Button, Badge, EmptyState } from '../components/ui.jsx'

export default function EventDetails() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/events" className="text-sm text-swiss-muted hover:text-swiss-text flex items-center gap-2 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Events
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <header>
            <div className="flex gap-2 mb-4">
              <Badge tone="blue">WORKSHOP</Badge>
              <Badge tone="slate">ONLINE</Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-swiss-text">React Performance Workshop</h1>
            <p className="mt-4 text-lg text-swiss-muted leading-relaxed">
              Join senior engineers from our alumni network as we deep dive into rendering optimizations, useMemo pitfalls, and concurrent mode in modern React applications.
            </p>
          </header>

          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase font-mono tracking-widest border-b border-swiss-border pb-2 mb-4">About this Event</h2>
            <div className="space-y-4 text-sm text-swiss-text leading-relaxed">
              <p>This hands-on workshop is designed for developers who already know React but want to learn how to make their applications faster.</p>
              <p>We'll cover:</p>
              <ul className="list-disc pl-5 space-y-1 text-swiss-muted">
                <li>Identifying render bottlenecks using React Profiler</li>
                <li>When (and when not) to use useMemo and useCallback</li>
                <li>Code-splitting strategies</li>
                <li>State collocation</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase font-mono tracking-widest border-b border-swiss-border pb-2 mb-4">Attendees (45)</h2>
            <EmptyState 
              title="Attendees Hidden" 
              description="Attendee list requires the Events API."
            />
            <p className="mt-4 text-center text-[10px] font-mono tracking-widest text-red-400 uppercase">
              BACKEND DEPENDENCY: GET /events/:id/attendees
            </p>
          </Card>
        </div>

        <div className="w-full md:w-80 shrink-0 space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase font-mono tracking-widest mb-4">Details</h2>
            <ul className="space-y-4 text-sm">
              <li className="flex flex-col gap-1">
                <span className="text-swiss-label font-mono text-[10px] uppercase">Date & Time</span>
                <span className="text-swiss-text font-medium">Saturday, October 24</span>
                <span className="text-swiss-muted">10:00 AM - 2:00 PM PST</span>
              </li>
              <li className="flex flex-col gap-1">
                <span className="text-swiss-label font-mono text-[10px] uppercase">Location</span>
                <span className="text-swiss-text font-medium">Zoom (Link provided upon RSVP)</span>
              </li>
              <li className="flex flex-col gap-1">
                <span className="text-swiss-label font-mono text-[10px] uppercase">Host</span>
                <span className="text-swiss-text font-medium">Rahul Sharma</span>
                <span className="text-swiss-muted">Senior Frontend Engineer</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-swiss-border space-y-3">
              <Button className="w-full" disabled>RSVP Now</Button>
              <Button variant="secondary" className="w-full" disabled>Add to Calendar</Button>
              <p className="text-center text-[10px] font-mono tracking-widest text-red-400 uppercase mt-2">
                BACKEND DEPENDENCY: POST /events/:id/rsvp
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
