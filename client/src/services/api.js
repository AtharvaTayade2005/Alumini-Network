import { authService } from './auth.service.js'
import { userService } from './user.service.js'
import { directoryService } from './directory.service.js'
import { jobsService } from './jobs.service.js'
import { eventsService } from './events.service.js'
import { mentorshipService } from './mentorship.service.js'
import { messagingService } from './messaging.service.js'
import { notificationService } from './notification.service.js'
import { resumeService } from './resume.service.js'
import { aiService } from './ai.service.js'
import { donationService } from './donation.service.js'
import { adminService } from './admin.service.js'
import { announcementService } from './announcement.service.js'

export const auth = {
  login: (creds) => authService.login(creds),
  register: (data) => authService.register(data),
  logout: () => authService.logout(),
  me: () => authService.me(),
  getSession: () => authService.getSession(),
  switchDemoUser: (id) => authService.switchDemoUser(id),
  getDemoUsers: () => authService.getDemoUsers(),
}

export const profiles = {
  me: () => userService.getProfile(),
  byId: (id) => userService.getProfile(id),
  updateMe: (data) => userService.updateProfile(data),
  skills: (id) => userService.getProfile(id).then((res) => ({ data: res.data.skills })),
  privacy: () => userService.getPrivacy(),
  updatePrivacy: (data) => userService.updatePrivacy(data),
}

export const directory = {
  search: (params) => directoryService.search(params),
  filters: () => directoryService.getFilters(),
  byId: (id) => directoryService.getById(id),
}

export const jobs = {
  list: (params) => jobsService.list(params),
  byId: (id) => jobsService.byId(id),
  company: (id) => jobsService.company(id),
  create: (data) => jobsService.create(data),
  save: (id) => jobsService.save(id),
  unsave: (id) => jobsService.unsave(id),
  saved: (params) => jobsService.saved(params),
  apply: (id, data) => jobsService.apply(id, data),
  myApplications: (params) => jobsService.myApplications(params),
  applicationsForJob: (id, params) => jobsService.applicationsForJob(id, params),
  review: (jobId, appId, status) => jobsService.review(jobId, appId, status),
  withdraw: (appId) => jobsService.withdraw(appId),
}

export const events = {
  list: (params) => eventsService.list(params),
  byId: (id) => eventsService.byId(id),
  rsvp: (id) => eventsService.rsvp(id),
  cancelRsvp: (id) => eventsService.cancelRsvp(id),
  create: (data) => eventsService.create(data),
}

export const mentorship = {
  mentors: (params) => mentorshipService.getMentors(params),
  requests: (params) => mentorshipService.getRequests(params),
  request: (data) => mentorshipService.request(data),
  respond: (id, data) => mentorshipService.respond(id, data),
  cancel: (id) => mentorshipService.cancel(id),
  mentorships: (params) => mentorshipService.getMentorships(params),
  complete: (id) => mentorshipService.complete(id),
  end: (id) => mentorshipService.end(id),
}

export const messages = {
  conversations: () => messagingService.getConversations(),
  withPeer: (id) => messagingService.getThread(id),
  send: (id, body) => messagingService.sendMessage(id, body),
}

export const notifications = {
  list: (params) => notificationService.list(params),
  unreadCount: () => notificationService.unreadCount(),
  markRead: (id) => notificationService.markRead(id),
  markAllRead: () => notificationService.markAllRead(),
  remove: (id) => notificationService.remove(id),
}

export const resumes = {
  get: (id) => resumeService.getResume(id),
  upload: (data) => resumeService.uploadResume(data),
  delete: (id) => resumeService.deleteResume(id),
}

export const ai = {
  chat: (prompt) => aiService.askAssistant(prompt),
  readiness: (role) => aiService.analyzeJobReadiness(role),
  analyzeResume: (text) => aiService.analyzeResume(text),
  search: (query) => aiService.getSemanticSearch(query),
}

export const donations = {
  funds: () => donationService.getFunds(),
  history: (id) => donationService.getHistory(id),
  all: () => donationService.getAllDonations(),
  donate: (data) => donationService.donate(data),
}

export const announcements = {
  list: (params) => announcementService.list(params),
  create: (data) => announcementService.create(data),
  update: (id, data) => announcementService.update(id, data),
  remove: (id) => announcementService.remove(id),
}

export const admin = {
  metrics: () => adminService.getDashboardMetrics(),
  users: (params) => adminService.getUsers(params),
  verify: (id, approved, notes) => adminService.verifyAlumni(id, approved, notes),
  updateRole: (id, role) => adminService.updateUserRole(id, role),
  moderateJob: (id, action) => adminService.moderateJob(id, action),
  auditLogs: (params) => adminService.getAuditLogs(params),
}

export const connections = {
  list: async () => ({ data: [] }),
  pending: async () => ({
    data: [
      {
        id: 'conn_req_1',
        peer: { id: 'u_alumni_2', name: 'Neha Kapoor', avatarUrl: null },
        direction: 'incoming',
      },
    ],
  }),
  stats: async () => ({ data: { connections: 18, pending_received: 1, pending_sent: 2 } }),
  status: async () => ({ data: { status: 'none' } }),
  request: async (userId, note) => ({ message: 'Connection request sent' }),
  respond: async (id, action) => ({ message: `Connection ${action}ed` }),
  remove: async (id) => ({ message: 'Connection removed' }),
}

export const oauth = {
  providers: async () => ({
    data: {
      providers: [
        { provider: 'google', label: 'Google Workspace' },
        { provider: 'linkedin', label: 'LinkedIn Learning' },
      ],
    },
  }),
  startUrl: (p) => '#',
  linkUrl: (p) => '#',
  accounts: async () => ({ data: { accounts: [], providers: [] } }),
  unlink: async () => ({ message: 'Unlinked' }),
}
