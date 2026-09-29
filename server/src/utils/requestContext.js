/**
 * Audit-log context for a request. Shared so every controller records the same
 * shape of client information.
 */
export function contextOf(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') }
}
