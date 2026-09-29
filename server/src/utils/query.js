export function createPageMeta({ page, limit, total }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const rawPage = Number.parseInt(query.page, 10)
  const rawLimit = Number.parseInt(query.limit, 10)

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const limit = Number.isNaN(rawLimit) || rawLimit < 1
    ? defaultLimit
    : Math.min(rawLimit, maxLimit)

  return { page, limit, offset: (page - 1) * limit }
}

export function toIntArray(value) {
  if (value === undefined || value === null || value === '') return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return list
    .map((v) => Number.parseInt(String(v).trim(), 10))
    .filter((v) => !Number.isNaN(v))
}

export function toDateArray(value) {
  if (value === undefined || value === null || value === '') return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return list
    .map((v) => String(v).trim())
    .filter((v) => /^\d{4}$/.test(v))
    .map(Number)
}

const SORTABLE = {
  alumni: {
    newest: 'u.created_at DESC',
    oldest: 'u.created_at ASC',
    name: 'u.last_name ASC, u.first_name ASC',
    'graduation_year': 'ap.graduation_year DESC NULLS LAST',
    'graduation_year_asc': 'ap.graduation_year ASC NULLS LAST',
  },
  jobs: {
    newest: 'j.created_at DESC',
    oldest: 'j.created_at ASC',
    title: 'j.title ASC',
    deadline: 'j.deadline ASC NULLS LAST',
    salary: 'j.salary_max DESC NULLS LAST',
  },
  events: {
    upcoming: 'e.event_date ASC, e.start_time ASC',
    newest: 'e.created_at DESC',
    title: 'e.title ASC',
  },
  users: {
    newest: 'u.created_at DESC',
    name: 'u.last_name ASC, u.first_name ASC',
  },
}

export function resolveSort(query, resource, fallback) {
  const requested = String(query.sort ?? '')
  const table = SORTABLE[resource] ?? {}
  return table[requested] ?? table[fallback] ?? 'created_at DESC'
}
