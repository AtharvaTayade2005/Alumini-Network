export class AppError extends Error {
  constructor(statusCode, message, { code, details, isOperational = true } = {}) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code ?? defaultCode(statusCode)
    this.details = details
    this.isOperational = isOperational
  }
}

function defaultCode(statusCode) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  }
  return map[statusCode] ?? 'ERROR'
}

export const badRequest = (message, details) => new AppError(400, message, { details })
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, message)
export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, message)
export const notFound = (resource = 'Resource') => new AppError(404, `${resource} not found`)
export const conflict = (message) => new AppError(409, message)
export const unprocessable = (message, details) => new AppError(422, message, { details })
export const tooManyRequests = (message = 'Too many requests, please try again later') =>
  new AppError(429, message)
export const serviceUnavailable = (message) => new AppError(503, message)
