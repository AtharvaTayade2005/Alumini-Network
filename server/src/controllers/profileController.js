import * as profileModel from '../models/profileModel.js'
import * as userModel from '../models/userModel.js'
import * as connectionService from '../services/connectionService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getQuery } from '../middleware/validate.js'
import { sendCreated, sendSuccess } from '../utils/response.js'
import { badRequest, notFound } from '../utils/errors.js'
import { getRealtime } from '../sockets/index.js'

export async function loadProfile(userId) {
  const [alumni, student] = await Promise.all([
    profileModel.findAlumniProfileByUserId(userId),
    profileModel.findStudentProfileByUserId(userId),
  ])
  if (!alumni && !student) throw notFound('Profile')
  return { alumni, student }
}

export const getMyProfile = asyncHandler(async (req, res) => {
  const bundle = await profileModel.getProfileBundle(req.user.id)
  sendSuccess(res, bundle)
})

export const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { alumni } = await loadProfile(userId)

  if (alumni) {
    await profileModel.upsertAlumniProfile(userId, req.body)
  } else {
    await profileModel.upsertStudentProfile(userId, req.body)
  }
  if (req.body.skills) {
    await profileModel.syncSkills(userId, req.body.skills)
  }
  if (req.body.firstName || req.body.lastName || req.body.phone) {
    await userModel.updateUserFields(userId, req.body)
  }

  const bundle = await profileModel.getProfileBundle(userId)
  getRealtime()?.toUser(userId).emit('profile:updated', { at: new Date().toISOString() })
  sendSuccess(res, bundle, { message: 'Profile updated' })
})

export const getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params
  const [user, bundle, state] = await Promise.all([
    userModel.findById(userId),
    profileModel.getProfileBundle(userId),
    connectionService.getRequestState(req.user.id, userId),
  ])
  if (!user) throw notFound('User')

  const isSelf = userId === req.user.id
  const isAdmin = req.user.roles?.includes('ADMIN') || req.user.roles?.includes('MODERATOR')

  sendSuccess(res, {
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      avatarUrl: user.avatar_url,
      isEmailVerified: user.is_email_verified,
    },
    alumni: bundle.alumni,
    student: bundle.student,
    education: bundle.education,
    experience: bundle.experience,
    socialLinks: isSelf || isAdmin ? bundle.socialLinks : [],
    skills: bundle.skills,
    connectionState: state,
    privacy: isSelf ? bundle.privacy : null,
  })
})

export const getSkills = asyncHandler(async (req, res) => {
  const skills = await profileModel.getSkillsForUser(req.params.userId)
  sendSuccess(res, skills)
})

export const listSkills = asyncHandler(async (req, res) => {
  const skills = await profileModel.listSkills(getQuery(req))
  sendSuccess(res, skills)
})

export const getPrivacy = asyncHandler(async (req, res) => {
  const settings = await profileModel.ensurePrivacySettings(req.user.id)
  sendSuccess(res, settings)
})

export const updatePrivacy = asyncHandler(async (req, res) => {
  const settings = await profileModel.updatePrivacySettings(req.user.id, req.body)
  sendSuccess(res, settings, { message: 'Privacy settings updated' })
})

export const listEducation = asyncHandler(async (req, res) => {
  const entries = await profileModel.listEducation(req.user.id)
  sendSuccess(res, entries)
})

export const addEducation = asyncHandler(async (req, res) => {
  const entry = await profileModel.addEducation(req.user.id, req.body)
  sendCreated(res, entry, 'Education added')
})

export const deleteEducation = asyncHandler(async (req, res) => {
  await profileModel.deleteEducation(req.user.id, req.params.id)
  sendSuccess(res, null, { message: 'Education removed' })
})

export const listExperience = asyncHandler(async (req, res) => {
  const entries = await profileModel.listExperience(req.user.id)
  sendSuccess(res, entries)
})

export const addExperience = asyncHandler(async (req, res) => {
  const entry = await profileModel.addExperience(req.user.id, req.body)
  sendCreated(res, entry, 'Experience added')
})

export const deleteExperience = asyncHandler(async (req, res) => {
  await profileModel.deleteExperience(req.user.id, req.params.id)
  sendSuccess(res, null, { message: 'Experience removed' })
})

export const getSocialLinks = asyncHandler(async (req, res) => {
  const links = await profileModel.listSocialLinks(req.user.id)
  sendSuccess(res, links)
})

export const upsertSocialLink = asyncHandler(async (req, res) => {
  const link = await profileModel.upsertSocialLink(req.user.id, req.body)
  sendSuccess(res, link, { message: 'Social link saved' })
})

export const deleteSocialLink = asyncHandler(async (req, res) => {
  await profileModel.deleteSocialLink(req.user.id, req.params.id)
  sendSuccess(res, null, { message: 'Social link removed' })
})

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded')
  if (!req.file.mimetype?.includes('word') && req.file.mimetype !== 'application/pdf') {
    throw badRequest('Resume must be a PDF or DOCX file')
  }

  const url = `/uploads/resumes/${req.user.id}/${req.file.filename}`
  const result = await profileModel.setStudentResume(req.user.id, {
    url,
    filename: req.file.originalname,
  })
  sendSuccess(res, result, { message: 'Resume uploaded' })
})

export const deleteResume = asyncHandler(async (req, res) => {
  const result = await profileModel.setStudentResume(req.user.id, { url: null, filename: null })
  sendSuccess(res, result, { message: 'Resume removed' })
})
