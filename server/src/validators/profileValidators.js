import { z } from 'zod'
import { emailSchema, nameSchema, optionalText, uuidSchema } from './authValidators.js'

const coordinate = z.coerce.number().min(-90).max(90).nullable().optional()
const longitude = z.coerce.number().min(-180).max(180).nullable().optional()

export const privacySettingsSchema = z.object({
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showEmployer: z.boolean().optional(),
  showSocialLinks: z.boolean().optional(),
  showProfileInDirectory: z.boolean().optional(),
  showMentorshipAvailability: z.boolean().optional(),
  allowConnectionRequests: z.boolean().optional(),
  allowMessagesFrom: z.enum(['everyone', 'connections', 'nobody']).optional(),
})

export const updateUserSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/).optional().nullable()
    .or(z.literal('').transform(() => null)),
  email: emailSchema.optional(),
})

export const alumniProfileSchema = z.object({
  graduationYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()),
  degree: z.string().trim().max(150).optional().nullable(),
  department: z.string().trim().max(150).optional().nullable(),
  currentCompany: z.string().trim().max(150).optional().nullable(),
  currentPosition: z.string().trim().max(150).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  bio: optionalText(2000),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  latitude: coordinate,
  longitude,
  isOpenToMentor: z.boolean().optional(),
  mentorshipCapacity: z.coerce.number().int().min(0).max(10).optional(),
  showOnMap: z.boolean().optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
}).refine(
  (data) => (data.latitude == null) === (data.longitude == null),
  { message: 'Latitude and longitude must be provided together', path: ['latitude'] },
)

export const studentProfileSchema = z.object({
  degree: z.string().trim().min(2).max(150),
  department: z.string().trim().max(150).optional().nullable(),
  yearOfStudy: z.coerce.number().int().min(1).max(6),
  expectedGraduation: z.coerce.number().int().min(new Date().getFullYear())
    .max(new Date().getFullYear() + 10).optional().nullable(),
  careerInterests: optionalText(1500),
  bio: optionalText(2000),
  isOpenToMentorship: z.boolean().optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
})

export const educationSchema = z.object({
  institution: z.string().trim().min(2).max(200),
  degree: z.string().trim().max(150).optional().nullable(),
  fieldOfStudy: z.string().trim().max(150).optional().nullable(),
  startYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 10).optional().nullable(),
  endYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 10).optional().nullable(),
  grade: z.string().trim().max(20).optional().nullable(),
  description: optionalText(1000),
}).refine(
  (data) => !data.startYear || !data.endYear || data.endYear >= data.startYear,
  { message: 'End year must be after the start year', path: ['endYear'] },
)

export const experienceSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  companyId: uuidSchema.optional().nullable(),
  title: z.string().trim().min(2).max(150),
  location: z.string().trim().max(150).optional().nullable(),
  description: optionalText(2000),
  isCurrent: z.boolean().default(false),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
}).refine(
  (data) => !data.isCurrent || !data.endDate,
  { message: 'A current role cannot have an end date', path: ['endDate'] },
).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: 'End date must be after the start date', path: ['endDate'] },
)

export const socialLinkSchema = z.object({
  platform: z.enum(['linkedin', 'github', 'portfolio', 'twitter', 'website', 'other']),
  url: z.string().trim().url('Enter a valid URL').max(500),
  isPrimary: z.boolean().default(false),
})

export const idParamSchema = z.object({
  id: z.string().uuid(),
})

export const userParamSchema = z.object({
  userId: z.string().uuid(),
})

export const skillSearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * A single PATCH /profiles/me endpoint serves both member types, so the
 * accepted body is the union of the user, alumni and student fields. Every
 * field is optional; the service layer applies partial updates.
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/).optional().nullable(),

  graduationYear: z.coerce.number().int().min(1950)
    .max(new Date().getFullYear() + 10).optional().nullable(),
  degree: z.string().trim().max(150).optional().nullable(),
  department: z.string().trim().max(150).optional().nullable(),
  currentCompany: z.string().trim().max(150).optional().nullable(),
  currentPosition: z.string().trim().max(150).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),

  yearOfStudy: z.coerce.number().int().min(1).max(10).optional().nullable(),
  expectedGraduation: z.coerce.number().int().min(1950)
    .max(new Date().getFullYear() + 15).optional().nullable(),
  careerInterests: optionalText(1500),
  isOpenToMentorship: z.boolean().optional(),

  bio: optionalText(2000),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  latitude: coordinate,
  longitude,
  isOpenToMentor: z.boolean().optional(),
  mentorshipCapacity: z.coerce.number().int().min(0).max(10).optional(),
  showOnMap: z.boolean().optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
}).refine(
  (data) => (data.latitude == null) === (data.longitude == null),
  { message: 'Latitude and longitude must be provided together', path: ['latitude'] },
)

export const directorySearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  graduationYear: z.coerce.number().int().min(1950).max(2200).optional(),
  graduationYearFrom: z.coerce.number().int().min(1950).max(2200).optional(),
  graduationYearTo: z.coerce.number().int().min(1950).max(2200).optional(),
  degree: z.string().trim().max(150).optional(),
  department: z.string().trim().max(150).optional(),
  location: z.string().trim().max(150).optional(),
  company: z.string().trim().max(150).optional(),
  industry: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  skills: z.string().trim().max(300).optional(),
  openToMentor: z.coerce.boolean().optional(),
  hasLocation: z.coerce.boolean().optional(),
  verifiedOnly: z.coerce.boolean().default(false),
  role: z.enum(['ALUMNI', 'STUDENT']).optional(),
  sort: z.enum(['name', 'recent', 'graduation_year', 'relevance'])
    .default('relevance'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export const mapSchema = z.object({
  country: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
})

export const mentorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  skill: z.string().trim().max(100).optional(),
  availableOnly: z.enum(['true', 'false']).default('true'),
})
