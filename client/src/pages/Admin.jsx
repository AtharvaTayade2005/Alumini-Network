import { useState } from 'react'
import { Card, Button, Badge, EmptyState, Field, Input, Select } from '../components/ui.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users & Alumni' },
  { id: 'jobs', label: 'Job Moderation' },
  { id: 'events', label: 'Events' },
  { id: 'reports', label: 'Reports' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">ADMIN &mdash; 01</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">ADMIN DASHBOARD</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Platform administration, moderation, and overview.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        <nav className="w-full lg:w-56 shrink-0 flex flex-col gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-swiss-surface text-swiss-text border-l-2 border-swiss-text'
                  : 'text-swiss-muted hover:bg-swiss-surface hover:text-swiss-text border-l-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-xs font-mono text-swiss-label uppercase tracking-widest">Total Users</p>
                  <p className="text-2xl font-bold text-swiss-text mt-2">-</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-mono text-swiss-label uppercase tracking-widest">Active Jobs</p>
                  <p className="text-2xl font-bold text-swiss-text mt-2">-</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-mono text-swiss-label uppercase tracking-widest">Reports</p>
                  <p className="text-2xl font-bold text-swiss-text mt-2">-</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-mono text-swiss-label uppercase tracking-widest">Events</p>
                  <p className="text-2xl font-bold text-swiss-text mt-2">-</p>
                </Card>
              </div>
              <Card className="p-10">
                <EmptyState
                  title="Admin API Required"
                  description="System metrics and analytics are currently unavailable."
                  action={<Button disabled>Refresh Metrics</Button>}
                />
                <p className="mt-6 text-center text-[10px] font-mono text-swiss-label uppercase tracking-widest">
                  BACKEND DEPENDENCY: ADMIN API
                </p>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <Card>
              <div className="border-b border-swiss-border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-swiss-text">User Management</h2>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search users..." className="h-8 text-sm" />
                  <Select className="h-8 text-sm w-32">
                    <option>All roles</option>
                    <option>Alumni</option>
                    <option>Student</option>
                    <option>Admin</option>
                  </Select>
                </div>
              </div>
              <div className="p-10">
                <EmptyState
                  title="No users loaded"
                  description="User management requires the Admin Users API to view and modify user states."
                />
              </div>
            </Card>
          )}

          {activeTab === 'jobs' && (
            <Card>
              <div className="border-b border-swiss-border px-5 py-4">
                <h2 className="text-sm font-semibold text-swiss-text">Job Moderation</h2>
              </div>
              <div className="p-10">
                <EmptyState
                  title="Job Moderation Unavailable"
                  description="Flagging, approving, and rejecting jobs requires the Admin Jobs API."
                />
              </div>
            </Card>
          )}

          {activeTab === 'events' && (
            <Card>
              <div className="border-b border-swiss-border px-5 py-4">
                <h2 className="text-sm font-semibold text-swiss-text">Event Management</h2>
              </div>
              <div className="p-10">
                <EmptyState
                  title="No events to manage"
                  description="Global event moderation is dependent on the completion of the Events Module."
                />
              </div>
            </Card>
          )}

          {activeTab === 'reports' && (
            <Card>
              <div className="border-b border-swiss-border px-5 py-4">
                <h2 className="text-sm font-semibold text-swiss-text">Reports & Moderation</h2>
              </div>
              <div className="p-10">
                <EmptyState
                  title="All clear"
                  description="Report and moderation queue requires the Moderation API."
                />
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
