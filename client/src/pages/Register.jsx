import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Alert, Button, Card, Checkbox, Field, FieldErrorSummary, Input, Select, Spinner,
} from '../components/ui.jsx'

const currentYear = new Date().getFullYear()
const graduationYears = Array.from({ length: 70 }, (_, index) => currentYear - index)

const initial = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'ALUMNI',
  graduationYear: '',
  degree: '',
  department: '',
  yearOfStudy: '1',
  acceptTerms: false,
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initial)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isAlumni = form.role === 'ALUMNI'

  function update(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  function onRoleChange(event) {
    const role = event.target.value
    setForm((prev) => ({
      ...prev,
      role,
      // Clear the field the new role does not use so the payload stays clean.
      graduationYear: role === 'ALUMNI' ? prev.graduationYear : '',
      yearOfStudy: role === 'STUDENT' ? prev.yearOfStudy : '',
    }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      acceptTerms: form.acceptTerms,
    }
    if (isAlumni) {
      payload.graduationYear = Number(form.graduationYear) || undefined
    } else {
      payload.yearOfStudy = Number(form.yearOfStudy) || undefined
    }
    if (form.degree.trim()) payload.degree = form.degree.trim()
    if (form.department.trim()) payload.department = form.department.trim()

    setSubmitting(true)
    try {
      await register(payload)
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Join the alumni network to find people, share opportunities, and stay connected.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
          <FieldErrorSummary error={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={update('firstName')}
                invalid={Boolean(error?.fields?.firstName)}
              />
            </Field>
            <Field label="Last name" required>
              <Input
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={update('lastName')}
                invalid={Boolean(error?.fields?.lastName)}
              />
            </Field>
          </div>

          <Field label="Email address" required>
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.edu"
              value={form.email}
              onChange={update('email')}
              invalid={Boolean(error?.fields?.email)}
            />
          </Field>

          <Field
            label="Password"
            hint="At least 10 characters with a number and a symbol"
            required
          >
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              invalid={Boolean(error?.fields?.password)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="I am a" required>
              <Select value={form.role} onChange={onRoleChange}>
                <option value="ALUMNI">Alumni</option>
                <option value="STUDENT">Current student</option>
                <option value="FACULTY">Faculty</option>
                <option value="STAFF">Staff</option>
              </Select>
            </Field>

            {isAlumni ? (
              <Field label="Graduation year" required>
                <Select
                  required
                  value={form.graduationYear}
                  onChange={update('graduationYear')}
                  invalid={Boolean(error?.fields?.graduationYear)}
                >
                  <option value="">Select year</option>
                  {graduationYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Year of study" required>
                <Select
                  value={form.yearOfStudy}
                  onChange={update('yearOfStudy')}
                >
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Degree" hint="Optional">
              <Input value={form.degree} onChange={update('degree')} placeholder="BSc Computer Science" />
            </Field>
            <Field label="Department" hint="Optional">
              <Input value={form.department} onChange={update('department')} placeholder="Computing" />
            </Field>
          </div>

          <Checkbox
            label="I accept the terms of use and privacy policy"
            checked={form.acceptTerms}
            onChange={update('acceptTerms')}
          />
          {error?.fields?.acceptTerms ? (
            <p className="-mt-2 text-xs font-medium text-red-600">
              {error.fields.acceptTerms}
            </p>
          ) : null}

          {error && !Object.keys(error.fields ?? {}).length ? (
            <Alert tone="error">{error.message}</Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Spinner className="border-white/40 border-t-white" /> Creating account</> : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
