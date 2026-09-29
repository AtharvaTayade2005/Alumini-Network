import { ZodError } from 'zod'
import { unprocessable } from '../utils/errors.js'

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '_root',
    message: issue.message,
    code: issue.code,
  }))
}

export function validate({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (params) {
        req.params = params.parse(req.params)
      }
      if (query) {
        // Express 5 exposes req.query through a getter that re-parses on every
        // access, so a validated result cannot be written back to it. The
        // parsed value is published on req.validatedQuery instead, and
        // controllers read getQuery(req).
        req.validatedQuery = query.parse(req.query)
      }
      if (body) req.body = body.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return next(unprocessable('Validation failed', formatIssues(error)))
      }
      return next(error)
    }
  }
}

/**
 * Validated query parameters when the route declared a schema, otherwise the
 * raw ones. Always use this instead of touching req.query directly.
 */
export function getQuery(req) {
  return req.validatedQuery ?? req.query
}
