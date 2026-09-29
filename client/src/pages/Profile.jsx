import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { profiles } from '../services/api.js'
import {
  Alert, Badge, Button, Card, CardHeader, Checkbox, Field, FieldErrorSummary,
  Input, LoadingBlock, Select, Spinner, Textarea,
} from '../components/ui.jsx'

/** Translate the API's snake_case rows into the camelCase the form uses. */
function toForm(bundle, user) {
  const role = bundle.alumni ?? bundle.student ?? {}
  return {
    bio: role.bio ?? '',
    currentCompany: role.current_company ?? '',
    currentPosition: role.current_position ?? '',
    industry: role.industry ?? '',
    degree: role.degree ?? '',
    department: role.department ?? '',
    city: role.city ?? '',
    region: role.region ?? '',
    country: role.country ?? '',
    isOpenToMentor: Boolean(role.is_open_to_mentor),
    skills: (bundle.skills ?? []).map((skill) => skill.name).join(', '),
    // These are the only account fields the profile endpoint accepts.
    _email: user?.email ?? '',
  }
}

export default function Profile() {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, error: null, saving: false })
  const [form, setForm] = useState(null)
  const [banner, setBanner] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    profiles.me()
      .then((response) => {
        setForm(toForm(response.data, user))
        setState({ loading: false, error: null, saving: false })
      })
      .catch((error) => setState({ loading: false, error, saving: false }))
  }, [user])

  function update(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  async function onSubmit(event) {
    event.preventDefault()
    setState((prev) => ({ ...prev, saving: true, error: null }))
    setBanner(null)
    setFieldErrors({})

    const payload = {
      bio: form.bio.trim() || null,
      currentCompany: form.currentCompany.trim() || null,
      currentPosition: form.currentPosition.trim() || null,
      industry: form.industry.trim() || null,
      degree: form.degree.trim() || null,
      department: form.department.trim() || null,
      city: form.city.trim() || null,
      region: form.region.trim() || null,
      country: form.country.trim() || null,
      isOpenToMentor: form.isOpenToMentor,
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    }

    try {
      const response = await profiles.updateMe(payload)
      setForm(toForm(response.data, user))
      setBanner({ tone: 'success', text: response.message ?? 'Profile updated' })
    } catch (error) {
      setFieldErrors(error.fields ?? {})
      setBanner({ tone: 'error', text: error.message })
    } finally {
      setState((prev) => ({ ...prev, saving: false }))
    }
  }

  if (state.loading) {
    return (
      <Card><LoadingBlock rows={8} label="Loading your profile" /></Card>
    )
  }

  if (state.error && !form) {
    return (
      <Card>
        <div className="p-5">
          <Alert tone="error" title="Could not load your profile">
            {state.error.message}
          </Alert>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          This is what other members see in the directory.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {banner ? (
          <Alert tone={banner.tone === 'success' ? 'success' : 'error'}>
            {banner.text}
          </Alert>
        ) : null}
        <FieldErrorSummary error={banner?.tone === 'error' ? { message: banner.text, fields: fieldErrors } : null} />

        <Card>
          <CardHeader title="About you" description="A short summary helps people know who you are." />
          <div className="space-y-4 p-5">
            <Field label="Bio" hint="Up to 2000 characters">
              <Textarea
                rows={5}
                value={form.bio}
                onChange={update('bio')}
                placeholder="Share your background, what you are working on, and what you are looking for."
                invalid={Boolean(fieldErrors.bio)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Degree">
                <Input value={form.degree} onChange={update('degree')} invalid={Boolean(fieldErrors.degree)} />
              </Field>
              <Field label="Department">
                <Input value={form.department} onChange={update('department')} />
              </Field>
            </div>

            <Field label="Skills" hint="Comma separated">
              <Input
                value={form.skills}
                onChange={update('skills')}
                placeholder="TypeScript, PostgreSQL, React"
                invalid={Boolean(fieldErrors.skills)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Work" description="Where you are now." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Current company">
              <Input value={form.currentCompany} onChange={update('currentCompany')} invalid={Boolean(fieldErrors.currentCompany)} />
            </Field>
            <Field label="Current position">
              <Input value={form.currentPosition} onChange={update('currentPosition')} invalid={Boolean(fieldErrors.currentPosition)} />
            </Field>
            <Field label="Industry">
              <Input value={form.industry} onChange={update('industry')} invalid={Boolean(fieldErrors.industry)} />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox
                label="Open to mentoring"
                description="Show the mentoring badge in the directory"
                checked={form.isOpenToMentor}
                onChange={update('isOpenToMentor')}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Location"
            description="Only shown publicly if you enable it in privacy settings."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="City">
              <Input value={form.city} onChange={update('city')} />
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={update('region')} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={update('country')} />
            </Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={state.saving}>
            {state.saving ? <><Spinner className="border-white/40 border-t-white" /> Saving</> : 'Save changes'}
          </Button>
          <span className="text-sm text-slate-500">Signed in as {form._email}</span>
        </div>
      </form>

      <PrivacyPanel />
    </div>
  )
}

function PrivacyPanel() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    profiles.privacy()
      .then((response) => setSettings(response.data))
      .catch((error) => setMessage({ tone: 'error', text: error.message }))
  }, [])

  if (!settings) return null

  // Reads come back as snake_case database rows, but the update endpoint
  // accepts camelCase, so each option carries both names.
  async function toggle(column, apiField) {
    setSaving(true)
    setMessage(null)
    try {
      const response = await profiles.updatePrivacy({ [apiField]: !settings[column] })
      setSettings(response.data)
      setMessage({ tone: 'success', text: response.message ?? 'Privacy updated' })
    } catch (error) {
      setMessage({ tone: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const options = [
    ['show_email', 'showEmail', 'Show my email address', 'Other members can see your email.'],
    ['show_phone', 'showPhone', 'Show my phone number', 'Other members can see your number.'],
    ['show_location', 'showLocation', 'Show my city and country', 'Otherwise these stay hidden.'],
    ['show_employer', 'showEmployer', 'Show my current employer', 'Useful for recruiting and mentoring.'],
    ['show_social_links', 'showSocialLinks', 'Show my social links', 'LinkedIn, GitHub and portfolio.'],
    ['show_profile_in_directory', 'showProfileInDirectory', 'Appear in the alumni directory', 'Turn off to hide from search.'],
    ['show_on_map', null, 'Appear on the alumni map', 'Requires verified alumni status.'],
  ]

  return (
    <Card>
      <CardHeader
        title="Privacy"
        description="You control what the directory exposes about you."
      />
      <div className="space-y-3.5 p-5">
        {message ? (
          <Alert tone={message.tone}>{message.text}</Alert>
        ) : null}
        {options.map(([column, apiField, label, description]) => (
          <div key={column}>
            <Checkbox
              label={label}
              description={description}
              checked={Boolean(settings[column])}
              disabled={saving || !apiField}
              onChange={() => toggle(column, apiField)}
            />
          </div>
        ))}

        <div className="pt-1">
          <Field label="Who can message me">
            <Select
              value={settings.allow_messages_from ?? 'connections'}
              disabled={saving}
              onChange={async (event) => {
                setSaving(true)
                try {
                  const response = await profiles.updatePrivacy({
                    allowMessagesFrom: event.target.value,
                  })
                  setSettings(response.data)
                  setMessage({ tone: 'success', text: 'Messaging preference updated' })
                } catch (error) {
                  setMessage({ tone: 'error', text: error.message })
                } finally {
                  setSaving(false)
                }
              }}
            >
              <option value="everyone">Everyone</option>
              <option value="connections">My connections only</option>
              <option value="nobody">Nobody</option>
            </Select>
          </Field>
        </div>
      </div>
    </Card>
  )
}
