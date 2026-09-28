const plannedStatus = 'Planned module - not implemented in the foundation build.'

export default function PagePlaceholder({ title, description = plannedStatus, status = plannedStatus }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      {status ? <p className="mt-4 text-sm font-medium text-amber-600">{status}</p> : null}
    </section>
  )
}
