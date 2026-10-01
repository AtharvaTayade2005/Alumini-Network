import { api } from './http.js'

export const auth = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  changePassword: (payload) => api.post('/auth/change-password', payload),
}

export const profiles = {
  me: () => api.get('/profiles/me'),
  updateMe: (payload) => api.patch('/profiles/me', payload),
  byId: (userId) => api.get(`/profiles/${userId}`),
  skills: (userId) => api.get(`/profiles/${userId}/skills`),
  privacy: () => api.get('/profiles/me/privacy'),
  updatePrivacy: (payload) => api.patch('/profiles/me/privacy', payload),
  education: {
    list: () => api.get('/profiles/me/education'),
    add: (payload) => api.post('/profiles/me/education', payload),
    remove: (id) => api.delete(`/profiles/me/education/${id}`),
  },
  experience: {
    list: () => api.get('/profiles/me/experience'),
    add: (payload) => api.post('/profiles/me/experience', payload),
    remove: (id) => api.delete(`/profiles/me/experience/${id}`),
  },
  socialLinks: {
    list: () => api.get('/profiles/me/social-links'),
    save: (payload) => api.put('/profiles/me/social-links', payload),
    remove: (id) => api.delete(`/profiles/me/social-links/${id}`),
  },
  resume: {
    upload: (file) => {
      const form = new FormData()
      form.append('resume', file)
      return api.post('/profiles/me/resume', form)
    },
    remove: () => api.delete('/profiles/me/resume'),
  },
  skillTaxonomy: (params) => api.get('/profiles/skills', { params }),
}

export const directory = {
  search: (params) => api.get('/profiles/directory', { params }),
  filters: () => api.get('/profiles/directory/filters'),
  mapPoints: (params) => api.get('/profiles/directory/map', { params }),
}

export const connections = {
  list: (params) => api.get('/connections', { params }),
  pending: () => api.get('/connections/pending'),
  stats: () => api.get('/connections/stats'),
  status: (userId) => api.get(`/connections/status/${userId}`),
  mutuals: (userId) => api.get(`/connections/mutuals/${userId}`),
  request: (userId, message) => api.post('/connections', { userId, message }),
  respond: (connectionId, action) =>
    api.patch(`/connections/${connectionId}`, { action }),
  remove: (userId) => api.delete(`/connections/${userId}`),
  block: (userId) => api.post(`/connections/block/${userId}`),
}

export const messages = {
  conversations: () => api.get('/messages/conversations'),
  withPeer: (peerId, params) => api.get(`/messages/with/${peerId}`, { params }),
  send: (recipientId, body) => api.post('/messages', { recipientId, body }),
  markRead: (peerId) => api.post(`/messages/read/${peerId}`),
  search: (q, limit = 20) => api.get('/messages/search', { params: { q, limit } }),
}

export const mentorship = {
  mentors: (params) => api.get('/mentorship/mentors', { params }),
  requests: (params) => api.get('/mentorship/requests', { params }),
  mentorships: (params) => api.get('/mentorship/mentorships', { params }),
  request: (payload) => api.post('/mentorship/requests', payload),
  respond: (requestId, payload) => api.patch(`/mentorship/requests/${requestId}`, payload),
  cancel: (requestId) => api.delete(`/mentorship/requests/${requestId}`),
  end: (relationshipId, endReason) =>
    api.patch(`/mentorship/mentorships/${relationshipId}/end`, { endReason }),
  complete: (relationshipId) =>
    api.patch(`/mentorship/mentorships/${relationshipId}/complete`),
}

export const jobs = {
  list: (params) => api.get('/jobs', { params }),
  byId: (id) => api.get(`/jobs/${id}`),
  create: (payload) => api.post('/jobs', payload),
  update: (id, payload) => api.put(`/jobs/${id}`, payload),
  remove: (id) => api.delete(`/jobs/${id}`),
  apply: (id, payload) => api.post(`/jobs/${id}/applications`, payload),
  applicationsForJob: (id, params) => api.get(`/jobs/${id}/applications`, { params }),
  review: (jobId, applicationId, status) =>
    api.patch(`/jobs/${jobId}/applications/${applicationId}`, { status }),
  myApplications: (params) => api.get('/jobs/applications', { params }),
  withdraw: (applicationId) =>
    api.patch(`/jobs/applications/${applicationId}/withdraw`),
  save: (id) => api.post(`/jobs/${id}/save`),
  unsave: (id) => api.delete(`/jobs/saved/${id}`),
  saved: (params) => api.get('/jobs/saved', { params }),
  companies: (params) => api.get('/jobs/companies', { params }),
  company: (id, params) => api.get(`/jobs/companies/${id}`, { params }),
  moderate: (id, action) => api.patch(`/jobs/${id}/moderate`, { action }),
}

/**
 * OAuth sign-in. `startUrl` is a full browser navigation rather than an XHR,
 * because the provider redirects the whole window back to the API.
 */
export const oauth = {
  providers: () => api.get('/auth/oauth/providers'),
  accounts: () => api.get('/auth/oauth/accounts'),
  unlink: (provider) => api.delete(`/auth/oauth/${provider}/link`),
  startUrl: (provider, params = {}) => api.url(`/auth/oauth/${provider}`, params),
  linkUrl: (provider) => api.url(`/auth/oauth/${provider}/link`),
}

export const notifications = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: (type) => api.get('/notifications/unread-count', { params: { type } }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
  preferences: () => api.get('/notifications/preferences'),
  updatePreferences: (payload) => api.patch('/notifications/preferences', payload),
}
