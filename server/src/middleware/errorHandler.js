import config from '../config/env.js'

export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode ?? 500
  const body = {
    error: {
      status: statusCode,
      message: statusCode === 500 ? 'Internal server error' : err.message,
    },
  }

  if (err.details) body.error.details = err.details
  if (config.env !== 'production' && statusCode === 500) body.error.stack = err.stack

  res.status(statusCode).json(body)
}
