import { db } from '../data/index.js'
import { authService } from './auth.service.js'

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export const userService = {
  async getProfile(userId) {
    await delay()
    const users = db.get('users')
    const students = db.get('students')
    const alumni = db.get('alumni')
    const professors = db.get('professors')

    let targetId = userId
    if (!targetId) {
      const current = await authService.getSession()
      targetId = current.data.id
    }

    const user = users.find((u) => u.id === targetId) || users[0]
    const student = students.find((s) => s.userId === user.id) || null
    const alum = alumni.find((a) => a.userId === user.id) || null
    const professor = professors.find((p) => p.userId === user.id) || null

    return {
      data: {
        user,
        student,
        alumni: alum,
        professor,
        skills: alum?.skills || student?.skills || [],
        education: alum?.careerJourney || professor?.education || [],
        experience: alum?.careerJourney || [],
        socialLinks: [
          alum?.linkedin || student?.linkedin || professor?.linkedin ? { id: 'l1', platform: 'LinkedIn', url: alum?.linkedin || student?.linkedin || professor?.linkedin } : null,
          alum?.github || student?.github ? { id: 'l2', platform: 'GitHub', url: alum?.github || student?.github } : null,
        ].filter(Boolean),
        privacy: {
          show_email: true,
          show_phone: false,
          show_location: true,
          show_employer: true,
          show_social_links: true,
          show_profile_in_directory: true,
          show_on_map: true,
          allow_messages_from: 'everyone',
        },
      },
    }
  },

  async updateProfile(payload) {
    await delay(100)
    const session = await authService.getSession()
    const current = session.data

    // Update user root
    db.update('users', (u) => u.id === current.id, (u) => ({
      ...u,
      name: payload.name || u.name,
      headline: payload.headline || payload.currentPosition ? `${payload.currentPosition} at ${payload.currentCompany || 'Company'}` : u.headline,
      city: payload.city || u.city,
      country: payload.country || u.country,
    }))

    // Update role specific
    if (current.roles?.includes('ALUMNI')) {
      db.update('alumni', (a) => a.userId === current.id, (a) => ({
        ...a,
        bio: payload.bio ?? a.bio,
        currentCompany: payload.currentCompany ?? a.currentCompany,
        currentPosition: payload.currentPosition ?? a.currentPosition,
        industry: payload.industry ?? a.industry,
        skills: payload.skills ? payload.skills.map((s, i) => ({ id: `sk_${i}`, name: s })) : a.skills,
        openToMentor: payload.isOpenToMentor !== undefined ? payload.isOpenToMentor : a.openToMentor,
      }))
    } else if (current.roles?.includes('STUDENT')) {
      db.update('students', (s) => s.userId === current.id, (s) => ({
        ...s,
        careerGoals: payload.bio ?? s.careerGoals,
        skills: payload.skills ? payload.skills.map((sk, i) => ({ id: `sk_${i}`, name: sk })) : s.skills,
      }))
    }

    return this.getProfile(current.id)
  },

  async getPrivacy() {
    await delay()
    return {
      data: {
        show_email: true,
        show_phone: false,
        show_location: true,
        show_employer: true,
        show_social_links: true,
        show_profile_in_directory: true,
        show_on_map: true,
        allow_messages_from: 'everyone',
      },
    }
  },

  async updatePrivacy(payload) {
    await delay(50)
    return {
      data: {
        show_email: true,
        show_phone: false,
        show_location: true,
        show_employer: true,
        show_social_links: true,
        show_profile_in_directory: true,
        show_on_map: true,
        allow_messages_from: 'everyone',
        ...payload,
      },
      message: 'Privacy settings updated successfully',
    }
  },
}
