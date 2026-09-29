export function sendSuccess(res, data, { status = 200, message, meta } = {}) {
  const body = { success: true }
  if (message) body.message = message
  body.data = data ?? null
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function sendCreated(res, data, message) {
  return sendSuccess(res, data, { status: 201, message })
}

export function sendNoContent(res) {
  return res.status(204).end()
}

export function buildMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }
}

export function paginated(res, rows, { page, limit, total }, { message } = {}) {
  return sendSuccess(res, rows, { meta: buildMeta({ page, limit, total }), message })
}
