import { forbidden } from '../utils/errors.js'

export const ROLES = { ADMIN: 'ADMIN', ALUMNI: 'ALUMNI', STUDENT: 'STUDENT', MODERATOR: 'MODERATOR' }

export function hasRole(user, role) {
  return Boolean(user?.roles?.includes(role))
}

export function hasAnyRole(user, roles) {
  return roles.some((role) => hasRole(user, role))
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(forbidden('Authentication required'))
    if (!hasAnyRole(req.user, roles)) {
      return next(forbidden(`This action requires one of: ${roles.join(', ')}`))
    }
    next()
  }
}

export function requireAdmin() {
  return requireRole(ROLES.ADMIN)
}

export function requireVerifiedAlumni({ loadProfile }) {
  return async (req, _res, next) => {
    if (!req.user) return next(forbidden('Authentication required'))
    if (hasRole(req.user, ROLES.ADMIN)) return next()
    if (!hasRole(req.user, ROLES.ALUMNI)) {
      return next(forbidden('Only alumni accounts can perform this action'))
    }
    const profile = await loadProfile(req.user.id)
    if (profile?.verification_status !== 'verified') {
      return next(forbidden('Your alumni account is awaiting verification'))
    }
    req.alumniProfile = profile
    next()
  }
}

export function requireSameUserOrAdmin(paramName = 'id') {
  return (req, _res, next) => {
    const targetId = req.params[paramName]
    if (hasRole(req.user, ROLES.ADMIN) || req.user.id === targetId) return next()
    return next(forbidden('You may only access your own resources'))
  }
}
