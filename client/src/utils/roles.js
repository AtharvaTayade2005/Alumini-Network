export const ROLES = {
  STUDENT: 'STUDENT',
  ALUMNI: 'ALUMNI',
  PROFESSOR: 'PROFESSOR',
  ADMIN: 'ADMIN',
}

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.ALUMNI]: 'Alumni',
  [ROLES.PROFESSOR]: 'Professor',
  [ROLES.ADMIN]: 'Administrator',
}

export const ROLE_BADGE_TONES = {
  [ROLES.STUDENT]: 'blue',
  [ROLES.ALUMNI]: 'green',
  [ROLES.PROFESSOR]: 'purple',
  [ROLES.ADMIN]: 'amber',
}

export const ROLE_DESCRIPTIONS = {
  [ROLES.STUDENT]: 'Current student seeking networking, mentorship, career guidance, and internships.',
  [ROLES.ALUMNI]: 'Graduated alumni offering mentorship, posting opportunities, and networking.',
  [ROLES.PROFESSOR]: 'Faculty advising students, sharing opportunities, and coordinating department relations.',
  [ROLES.ADMIN]: 'System administrator managing users, verifications, jobs, moderation, and audits.',
}
