import { mockUsers, DEMO_PRESET_USERS } from './users.js'
import { mockStudents } from './students.js'
import { mockAlumni } from './alumni.js'
import { mockProfessors } from './professors.js'
import { mockJobs } from './jobs.js'
import { mockApplications } from './applications.js'
import { mockMentorshipRequests, mockActiveMentorships } from './mentorshipRequests.js'
import { mockConversations, mockMessages } from './conversations.js'
import { mockEvents } from './events.js'
import { mockNotifications } from './notifications.js'
import { mockResumes } from './resumes.js'
import { mockDonationFunds, mockDonations } from './donations.js'
import { mockAnnouncements } from './announcements.js'
import { mockAnalytics, mockAuditLogs } from './analytics.js'

const STORAGE_KEY = 'alumni_network_mock_db_v1'

function getInitialStore() {
  return {
    users: mockUsers,
    students: mockStudents,
    alumni: mockAlumni,
    professors: mockProfessors,
    jobs: mockJobs,
    applications: mockApplications,
    mentorshipRequests: mockMentorshipRequests,
    activeMentorships: mockActiveMentorships,
    conversations: mockConversations,
    messages: mockMessages,
    events: mockEvents,
    notifications: mockNotifications,
    resumes: mockResumes,
    donationFunds: mockDonationFunds,
    donations: mockDonations,
    announcements: mockAnnouncements,
    analytics: mockAnalytics,
    auditLogs: mockAuditLogs,
    savedJobIdsByUser: {
      u_student_1: ['job_001', 'job_004'],
    },
  }
}

class MockDatabase {
  constructor() {
    this.store = this.load()
  }

  load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY)
      if (serialized) {
        const parsed = JSON.parse(serialized)
        // Ensure all required keys exist
        const initial = getInitialStore()
        return { ...initial, ...parsed }
      }
    } catch {
      // Fallback
    }
    return getInitialStore()
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store))
    } catch {
      // Storage quota or private browsing
    }
  }

  reset() {
    this.store = getInitialStore()
    this.save()
  }

  get(collection) {
    return this.store[collection] || []
  }

  set(collection, data) {
    this.store[collection] = data
    this.save()
  }

  update(collection, predicate, updater) {
    const items = this.store[collection] || []
    const updated = items.map((item) => (predicate(item) ? updater(item) : item))
    this.store[collection] = updated
    this.save()
    return updated
  }

  insert(collection, item) {
    if (!this.store[collection]) this.store[collection] = []
    this.store[collection] = [item, ...this.store[collection]]
    this.save()
    return item
  }

  remove(collection, predicate) {
    const items = this.store[collection] || []
    this.store[collection] = items.filter((item) => !predicate(item))
    this.save()
  }
}

export const db = new MockDatabase()
export { DEMO_PRESET_USERS }
