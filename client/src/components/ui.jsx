import { useId } from 'react'

export function cx(...values) {
  return values.filter(Boolean).join(' ')
}

export function Card({ children, className, as = 'section' }) {
  const Element = as
  return (
    <Element className={cx(
      'rounded-xl border border-slate-200 bg-white shadow-sm', className,
    )}>
      {children}
    </Element>
  )
}

export function CardHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  )
}

export function Button({
  children, variant = 'primary', size = 'md', className, type = 'button', ...rest
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  }
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
        'disabled:cursor-not-allowed',
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  )
}

const inputBase = 'w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-500'

export function Input({ className, invalid, ...rest }) {
  return (
    <input
      className={cx(
        inputBase,
        invalid
          ? 'border-red-400 focus:border-red-500'
          : 'border-slate-300 focus:border-slate-500',
        className,
      )}
      {...rest}
    />
  )
}

export function Textarea({ className, invalid, rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={cx(
        inputBase,
        invalid
          ? 'border-red-400 focus:border-red-500'
          : 'border-slate-300 focus:border-slate-500',
        className,
      )}
      {...rest}
    />
  )
}

export function Select({ className, invalid, children, ...rest }) {
  return (
    <select
      className={cx(
        inputBase,
        invalid ? 'border-red-400' : 'border-slate-300 focus:border-slate-500',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Checkbox({ label, description, ...rest }) {
  const id = useId()
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
        {...rest}
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        ) : null}
      </label>
    </div>
  )
}

export function Alert({ tone = 'error', title, children, onDismiss }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    info: 'border-slate-200 bg-slate-50 text-slate-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('rounded-lg border px-4 py-3 text-sm', tones[tone])}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 text-current/70 hover:bg-black/5"
            aria-label="Dismiss"
          >
            &times;
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Renders a 422 field-errors map from the API. */
export function FieldErrorSummary({ error, fallback = 'Please correct the highlighted fields.' }) {
  if (!error) return null
  const entries = Object.entries(error.fields ?? {})
  if (!entries.length) {
    return error.message ? <Alert tone="error">{error.message}</Alert> : null
  }
  return (
    <Alert tone="error" title={error.message ?? fallback}>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {entries.map(([field, detail]) => (
          <li key={field}>
            <span className="font-medium">{field}</span>: {detail}
          </li>
        ))}
      </ul>
    </Alert>
  )
}

export function Spinner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700',
        className,
      )}
    />
  )
}

export function LoadingBlock({ label = 'Loading', rows = 3 }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-slate-100"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      title="Something went wrong"
      description={error?.message ?? 'An unexpected error occurred.'}
      action={onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
    />
  )
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
  }
  return (
    <span className={cx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone],
    )}>
      {children}
    </span>
  )
}

export function Avatar({ name, src, size = 'md' }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cx('shrink-0 rounded-full object-cover', sizes[size])}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700',
        sizes[size],
      )}
    >
      {initials || '?'}
    </span>
  )
}

export function Pagination({ meta, onChange }) {
  if (!meta || !meta.totalPages || meta.totalPages < 1) return null
  const { page, totalPages, total, limit } = meta
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
      <p>
        Showing <span className="font-medium text-slate-900">{from}</span>-
        <span className="font-medium text-slate-900">{to}</span> of{' '}
        <span className="font-medium text-slate-900">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasPrev && page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-xs">Page {page} of {totalPages}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasNext && page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
