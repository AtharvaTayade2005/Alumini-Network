import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Alert, Button, Card, Field, FieldErrorSummary, Input, Spinner,
} from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from ?? '/dashboard'

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (caught) {
      setError(caught)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back. Sign in to reach your network.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <FieldErrorSummary error={error} />

          <Field label="Email address" required>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.edu"
              invalid={Boolean(error?.fields?.email)}
            />
          </Field>

          <Field label="Password" required>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={update('password')}
              invalid={Boolean(error?.fields?.password)}
            />
          </Field>

          {error && !Object.keys(error.fields ?? {}).length ? (
            <Alert tone="error">{error.message}</Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Spinner className="border-white/40 border-t-white" /> Signing in</> : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-slate-900 underline underline-offset-2">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  )
}
