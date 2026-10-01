import { mockUsers, mockJobs, mockEvents } from '../data/mock-db.js'

export const auth = {
  register: async (payload) => ({ data: { user: mockUsers[3] } }),
  login: async (payload) => ({ data: { user: mockUsers[3], accessToken: 'mock' } }),
  logout: async () => {},
  me: async () => ({ data: mockUsers[3] }),
}

export const profiles = {
  me: async () => ({ data: mockUsers[3] }),
  byId: async (userId) => ({ data: mockUsers.find(u => u.id === userId) || mockUsers[0] }),
  skills: async (userId) => ({ data: mockUsers.find(u => u.id === userId)?.skills || [] }),
}

export const directory = {
  search: async (params) => ({ data: mockUsers, meta: { total: mockUsers.length, page: 1, pages: 1 } }),
  filters: async () => ({ data: { graduationYears: [2026, 2023, 2021, 2018], industries: ['Technology', 'E-commerce'], countries: ['India'] } }),
}

export const jobs = {
  list: async (params) => ({ data: mockJobs, meta: { total: mockJobs.length, page: 1, pages: 1 } }),
  byId: async (id) => ({ data: mockJobs.find(j => j.id === id) || mockJobs[0] }),
  saved: async () => ({ data: [] }),
  myApplications: async () => ({ data: [] }),
}

export const events = {
  list: async () => ({ data: mockEvents, meta: { total: mockEvents.length } }),
  byId: async (id) => ({ data: mockEvents.find(e => e.id === id) || mockEvents[0] })
}

export const connections = {
  list: async () => ({ data: [] }),
  pending: async () => ({ data: [] }),
  stats: async () => ({ data: { connections: 12, pending: 2 } }),
  status: async () => ({ data: { status: 'none' } }),
  mutuals: async () => ({ data: [] }),
}

export const messages = {
  conversations: async () => ({ data: [] }),
  withPeer: async () => ({ data: [] }),
}

export const mentorship = {
  mentors: async () => ({ data: mockUsers.filter(u => u.openToMentor), meta: { total: 2, page: 1, pages: 1 } }),
  requests: async () => ({ data: [] }),
  mentorships: async () => ({ data: [] }),
}

export const notifications = {
  list: async () => ({ data: [], meta: { unread: 3 } }),
  unreadCount: async () => ({ data: { count: 3 } }),
}

export const oauth = {
  providers: async () => ({ data: { providers: [] } }),
}
