import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Card, Button, Checkbox, Field, Input, Select, Alert } from '../components/ui.jsx'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const TABS = [
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
  ]

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setMessage({ tone: 'error', text: 'Settings backend not yet implemented.' })
    }, 500)
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">09 &mdash; SETTINGS</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">SETTINGS</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Manage your account preferences, security, and notification behaviors.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        <nav className="w-full md:w-48 flex flex-col gap-1 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMessage(null); }}
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
          <Card className="p-6">
            {message ? <Alert tone={message.tone} className="mb-6">{message.text}</Alert> : null}

            {activeTab === 'account' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-swiss-text mb-4">Account Information</h2>
                  <div className="space-y-4">
                    <Field label="Email Address">
                      <Input defaultValue={user?.email || ''} readOnly className="bg-[var(--color-swiss-surface-alt)]" />
                    </Field>
                    <Field label="Language Preference">
                      <Select defaultValue="en">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </Select>
                    </Field>
                  </div>
                </div>
                <div className="pt-4 border-t border-swiss-border">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
                  <p className="mt-2 text-[10px] font-mono text-swiss-label uppercase tracking-widest">
                    BACKEND DEPENDENCY: SETTINGS API
                  </p>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-swiss-text mb-4">Email Notifications</h2>
                  <div className="space-y-4">
                    <Checkbox label="Messages" description="When someone sends you a direct message." defaultChecked />
                    <Checkbox label="Connections" description="When someone requests or accepts a connection." defaultChecked />
                    <Checkbox label="Mentorship" description="Updates about your mentorship requests." defaultChecked />
                    <Checkbox label="Jobs" description="When there are updates to jobs you saved." />
                    <Checkbox label="Events" description="Reminders for events you RSVP'd to." defaultChecked />
                  </div>
                </div>
                <div className="pt-4 border-t border-swiss-border">
                  <Button type="submit" disabled={saving}>Save preferences</Button>
                  <p className="mt-2 text-[10px] font-mono text-swiss-label uppercase tracking-widest">
                    BACKEND DEPENDENCY: NOTIFICATIONS PREF API
                  </p>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-swiss-text mb-4">Change Password</h2>
                  <div className="space-y-4 max-w-sm">
                    <Field label="Current password">
                      <Input type="password" />
                    </Field>
                    <Field label="New password">
                      <Input type="password" />
                    </Field>
                    <Field label="Confirm new password">
                      <Input type="password" />
                    </Field>
                  </div>
                </div>
                <div className="pt-4 border-t border-swiss-border">
                  <Button type="submit" disabled={saving}>Update password</Button>
                  <p className="mt-2 text-[10px] font-mono text-swiss-label uppercase tracking-widest">
                    BACKEND DEPENDENCY: SECURITY API
                  </p>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
