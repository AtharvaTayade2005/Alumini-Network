import { ROLES } from './roles.js'

export const PERMISSIONS = {
  // Navigation & View Permissions
  VIEW_DIRECTORY: 'VIEW_DIRECTORY',
  VIEW_STUDENTS: 'VIEW_STUDENTS',
  VIEW_JOBS: 'VIEW_JOBS',
  APPLY_JOBS: 'APPLY_JOBS',
  POST_JOBS: 'POST_JOBS',
  MANAGE_OWN_JOBS: 'MANAGE_OWN_JOBS',
  MODERATE_JOBS: 'MODERATE_JOBS',
  REQUEST_MENTORSHIP: 'REQUEST_MENTORSHIP',
  PROVIDE_MENTORSHIP: 'PROVIDE_MENTORSHIP',
  MANAGE_MENTEES: 'MANAGE_MENTEES',
  VIEW_EVENTS: 'VIEW_EVENTS',
  CREATE_EVENTS: 'CREATE_EVENTS',
  MANAGE_EVENTS: 'MANAGE_EVENTS',
  RSVP_EVENTS: 'RSVP_EVENTS',
  DONATE: 'DONATE',
  VIEW_DONATION_RECORDS: 'VIEW_DONATION_RECORDS',
  MANAGE_DONATIONS: 'MANAGE_DONATIONS',
  SEND_MESSAGES: 'SEND_MESSAGES',
  USE_AI_CAREER: 'USE_AI_CAREER',
  MANAGE_RESUME: 'MANAGE_RESUME',
  CREATE_ANNOUNCEMENTS: 'CREATE_ANNOUNCEMENTS',
  RECOMMEND_OPPORTUNITIES: 'RECOMMEND_OPPORTUNITIES',
  MANAGE_USERS: 'MANAGE_USERS',
  VERIFY_ALUMNI: 'VERIFY_ALUMNI',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  ACCESS_ADMIN_PANEL: 'ACCESS_ADMIN_PANEL',
}

const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_DIRECTORY,
    PERMISSIONS.VIEW_JOBS,
    PERMISSIONS.APPLY_JOBS,
    PERMISSIONS.REQUEST_MENTORSHIP,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.RSVP_EVENTS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.USE_AI_CAREER,
    PERMISSIONS.MANAGE_RESUME,
  ],
  [ROLES.ALUMNI]: [
    PERMISSIONS.VIEW_DIRECTORY,
    PERMISSIONS.VIEW_JOBS,
    PERMISSIONS.APPLY_JOBS,
    PERMISSIONS.POST_JOBS,
    PERMISSIONS.MANAGE_OWN_JOBS,
    PERMISSIONS.PROVIDE_MENTORSHIP,
    PERMISSIONS.MANAGE_MENTEES,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.RSVP_EVENTS,
    PERMISSIONS.DONATE,
    PERMISSIONS.VIEW_DONATION_RECORDS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.USE_AI_CAREER,
  ],
  [ROLES.PROFESSOR]: [
    PERMISSIONS.VIEW_DIRECTORY,
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_JOBS,
    PERMISSIONS.RECOMMEND_OPPORTUNITIES,
    PERMISSIONS.PROVIDE_MENTORSHIP,
    PERMISSIONS.MANAGE_MENTEES,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.CREATE_EVENTS,
    PERMISSIONS.RSVP_EVENTS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.CREATE_ANNOUNCEMENTS,
    PERMISSIONS.USE_AI_CAREER,
  ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
}

export function hasPermission(user, permission) {
  if (!user) return false
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean)
  if (userRoles.includes(ROLES.ADMIN)) return true
  return userRoles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission))
}

export function getUserPrimaryRole(user) {
  if (!user) return null
  if (user.roles?.includes(ROLES.ADMIN)) return ROLES.ADMIN
  if (user.roles?.includes(ROLES.PROFESSOR)) return ROLES.PROFESSOR
  if (user.roles?.includes(ROLES.ALUMNI)) return ROLES.ALUMNI
  if (user.roles?.includes(ROLES.STUDENT)) return ROLES.STUDENT
  return user.role || ROLES.STUDENT
}

export function getRoleNavigation(role) {
  switch (role) {
    case ROLES.STUDENT:
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/directory', label: 'Alumni Directory' },
        { to: '/mentorship', label: 'Find a Mentor' },
        { to: '/jobs', label: 'Jobs & Internships' },
        { to: '/resume', label: 'Resume' },
        { to: '/events', label: 'Events' },
        { to: '/messages', label: 'Messages' },
        { to: '/notifications', label: 'Notifications', badge: 'unread' },
        { to: '/assistant', label: 'AI Assistant' },
        { to: '/profile', label: 'My Profile' },
      ]
    case ROLES.ALUMNI:
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/directory', label: 'Alumni Directory' },
        { to: '/mentorship', label: 'Mentorship' },
        { to: '/jobs', label: 'Jobs' },
        { to: '/events', label: 'Events' },
        { to: '/donations', label: 'Donations' },
        { to: '/messages', label: 'Messages' },
        { to: '/notifications', label: 'Notifications', badge: 'unread' },
        { to: '/assistant', label: 'AI Assistant' },
        { to: '/profile', label: 'My Profile' },
      ]
    case ROLES.PROFESSOR:
      return [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/students', label: 'Students' },
        { to: '/directory', label: 'Alumni Directory' },
        { to: '/mentorship', label: 'Mentorship' },
        { to: '/jobs', label: 'Opportunities' },
        { to: '/announcements', label: 'Announcements' },
        { to: '/events', label: 'Events' },
        { to: '/messages', label: 'Messages' },
        { to: '/notifications', label: 'Notifications', badge: 'unread' },
        { to: '/profile', label: 'My Profile' },
      ]
    case ROLES.ADMIN:
      return [
        { to: '/admin/dashboard', label: 'Admin Dashboard' },
        { to: '/admin/users', label: 'Users' },
        { to: '/admin/verification', label: 'Alumni Verification' },
        { to: '/admin/jobs', label: 'Job Moderation' },
        { to: '/admin/events', label: 'Events' },
        { to: '/admin/donations', label: 'Donations' },
        { to: '/admin/analytics', label: 'Analytics' },
        { to: '/admin/audit-logs', label: 'Audit Logs' },
        { to: '/directory', label: 'Directory' },
        { to: '/messages', label: 'Messages' },
      ]
    default:
      return [
        { to: '/', label: 'Home' },
      ]
  }
}

export function canAccessRoute(user, path) {
  if (!user) return false
  const primaryRole = getUserPrimaryRole(user)
  if (primaryRole === ROLES.ADMIN) return true

  // Protect admin routes
  if (path.startsWith('/admin')) {
    return primaryRole === ROLES.ADMIN
  }

  // Protect Professor-only routes
  if (path.startsWith('/students') || path.startsWith('/announcements')) {
    return primaryRole === ROLES.PROFESSOR || primaryRole === ROLES.ADMIN
  }

  // Protect Student-only routes
  if (path.startsWith('/resume')) {
    return primaryRole === ROLES.STUDENT || primaryRole === ROLES.ADMIN
  }

  // Protect Alumni-only routes
  if (path.startsWith('/donations')) {
    return primaryRole === ROLES.ALUMNI || primaryRole === ROLES.ADMIN
  }

  return true
}
