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

export const notifications = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: (type) => api.get('/notifications/unread-count', { params: { type } }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
  preferences: () => api.get('/notifications/preferences'),
  updatePreferences: (payload) => api.patch('/notifications/preferences', payload),
}
