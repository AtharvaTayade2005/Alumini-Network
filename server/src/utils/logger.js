const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'error' : 'info')

const REDACTED_KEYS = new Set([
  'password', 'passwordhash', 'currentpassword', 'newpassword', 'token',
  'accesstoken', 'refreshtoken', 'secret', 'authorization', 'cookie',
  'clientsecret', 'apikey', 'tokenhash', 'cvv', 'cardnumber', 'pan',
])

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1))

  const output = {}
  for (const [key, val] of Object.entries(value)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      output[key] = '[redacted]'
    } else if (val && typeof val === 'object') {
      output[key] = redact(val, depth + 1)
    } else {
      output[key] = val
    }
  }
  return output
}

function emit(levelName, message, context) {
  if (LEVELS[levelName] > LEVELS[level]) return
  const record = {
    time: new Date().toISOString(),
    level: levelName,
    message,
    ...(context ? { context: redact(context) } : {}),
  }
  const line = JSON.stringify(record)
  if (levelName === 'error') process.stderr.write(`${line}\n`)
  else process.stdout.write(`${line}\n`)
}

const logger = {
  error: (message, context) => emit('error', message, context),
  warn: (message, context) => emit('warn', message, context),
  info: (message, context) => emit('info', message, context),
  debug: (message, context) => emit('debug', message, context),
}

export { redact }
export default logger
