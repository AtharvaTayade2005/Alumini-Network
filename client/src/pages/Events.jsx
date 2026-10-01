import { useState } from 'react'
import { Card, Button, Badge, EmptyState, Field, Input, Select, Textarea } from '../components/ui.jsx'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'discover', label: 'Discover' },
  { id: 'my_events', label: 'My Events' },
  { id: 'past', label: 'Past Events' },
]

export default function Events() {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [creating, setCreating] = useState(false)

  if (creating) {
    return (
      <div className="space-y-6">
        <header className="mb-4">
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">03 &mdash; EVENTS</p>
          <h1 className="text-3xl font-bold tracking-tight text-swiss-text">CREATE EVENT</h1>
        </header>
        <Card className="max-w-2xl p-6">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Event Name">
              <Input placeholder="e.g. Annual Tech Alumni Mixer" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <Input type="date" />
              </Field>
              <Field label="Time">
                <Input type="time" />
              </Field>
            </div>
            <Field label="Location">
              <Input placeholder="e.g. San Francisco, CA or Zoom Link" />
            </Field>
            <Field label="Category">
              <Select defaultValue="networking">
                <option value="networking">Networking</option>
                <option value="workshop">Workshop</option>
                <option value="reunion">Reunion</option>
                <option value="talk">Talk / Panel</option>
              </Select>
            </Field>
            <Field label="Description">
              <Textarea rows={4} placeholder="What to expect at this event..." />
            </Field>
            <div className="pt-4 border-t border-swiss-border flex items-center gap-3">
              <Button type="button" onClick={() => setCreating(false)} variant="secondary">Cancel</Button>
              <Button type="submit" disabled>Create Event</Button>
              <span className="text-[10px] font-mono text-swiss-label uppercase tracking-widest">
                BACKEND DEPENDENCY
              </span>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <header>
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">03 &mdash; EVENTS</p>
          <h1 className="text-3xl font-bold tracking-tight text-swiss-text">EVENTS & REUNIONS</h1>
          <p className="mt-2 text-sm text-swiss-muted">
            Discover networking events, workshops, and alumni reunions.
          </p>
        </header>
        <Button onClick={() => setCreating(true)}>Host an Event</Button>
      </div>

      <nav className="flex flex-wrap items-center gap-2 border-b border-swiss-border pb-px" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-swiss-text text-swiss-text'
                : 'border-transparent text-swiss-muted hover:text-swiss-text hover:border-swiss-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="pt-4">
        <EmptyState
          title="No events found"
          description="Event data is currently unavailable. The Events API is required to populate this view."
          action={<Button disabled>Refresh</Button>}
        />
        <p className="mt-6 text-center text-[10px] font-mono text-swiss-label uppercase tracking-widest">
          BACKEND DEPENDENCY: EVENTS API (RSVP, CALENDAR, LIST)
        </p>
      </div>
    </div>
  )
}
