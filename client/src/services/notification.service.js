import { db } from '../data/index.js'
import { authService } from './auth.service.js'

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export const notificationService = {
  async list(params = {}) {
    await delay()
    const session = await authService.getSession()
    const currentUserId = session.data.id
    const notifications = db.get('notifications')

    let userNotifs = notifications.filter((n) => n.recipientId === currentUserId)

    if (params.unreadOnly) {
      userNotifs = userNotifs.filter((n) => !n.is_read)
    }

    if (params.type && params.type !== 'all') {
      userNotifs = userNotifs.filter((n) => n.type === params.type)
    }

    const unreadCount = notifications.filter((n) => n.recipientId === currentUserId && !n.is_read).length

    return {
      data: userNotifs,
      meta: {
        total: userNotifs.length,
        unread: unreadCount,
      },
    }
  },

  async unreadCount() {
    await delay(30)
    const session = await authService.getSession()
    const currentUserId = session.data.id
    const notifications = db.get('notifications')
    const count = notifications.filter((n) => n.recipientId === currentUserId && !n.is_read).length

    return { data: { count, unread: count } }
  },

  async markRead(id) {
    await delay(40)
    db.update('notifications', (n) => n.id === id, (n) => ({ ...n, is_read: true }))
    return { message: 'Notification marked as read' }
  },

  async markAllRead() {
    await delay(60)
    const session = await authService.getSession()
    const currentUserId = session.data.id
    db.update('notifications', (n) => n.recipientId === currentUserId, (n) => ({ ...n, is_read: true }))
    return { message: 'All notifications marked as read' }
  },

  async remove(id) {
    await delay(40)
    db.remove('notifications', (n) => n.id === id)
    return { message: 'Notification removed' }
  },
}
