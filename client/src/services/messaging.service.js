import { db } from '../data/index.js'
import { authService } from './auth.service.js'

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export const messagingService = {
  async getConversations() {
    await delay()
    const session = await authService.getSession()
    const currentUserId = session.data.id
    const conversations = db.get('conversations')
    const users = db.get('users')

    const myConversations = conversations
      .filter((c) => c.participants.includes(currentUserId))
      .map((c) => {
        const peerId = c.participants.find((id) => id !== currentUserId)
        const peerUser = users.find((u) => u.id === peerId) || { name: 'Member', avatarUrl: null }
        return {
          id: c.id,
          peerId,
          name: peerUser.name,
          avatarUrl: peerUser.avatarUrl,
          headline: peerUser.headline,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: c.unreadCount?.[currentUserId] || 0,
          isOnline: true,
        }
      })

    return {
      data: myConversations,
      meta: { total: myConversations.length },
    }
  },

  async getThread(peerId) {
    await delay()
    const session = await authService.getSession()
    const currentUserId = session.data.id
    const messages = db.get('messages')

    const thread = messages.filter((m) => (
      (m.senderId === currentUserId && m.recipientId === peerId) ||
      (m.senderId === peerId && m.recipientId === currentUserId)
    ))

    return {
      data: thread,
      meta: { total: thread.length },
    }
  },

  async sendMessage(peerId, body) {
    await delay(80)
    const session = await authService.getSession()
    const currentUserId = session.data.id

    const newMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_${[currentUserId, peerId].sort().join('_')}`,
      senderId: currentUserId,
      recipientId: peerId,
      body,
      createdAt: new Date().toISOString(),
      isRead: false,
    }

    db.insert('messages', newMessage)

    // Update or create conversation summary
    const conversations = db.get('conversations')
    const convIndex = conversations.findIndex((c) => (
      c.participants.includes(currentUserId) && c.participants.includes(peerId)
    ))

    if (convIndex >= 0) {
      db.update('conversations', (c) => c.id === conversations[convIndex].id, (c) => ({
        ...c,
        lastMessage: body,
        lastMessageAt: new Date().toISOString(),
        unreadCount: {
          ...c.unreadCount,
          [peerId]: (c.unreadCount?.[peerId] || 0) + 1,
        },
      }))
    } else {
      db.insert('conversations', {
        id: `conv_${Date.now()}`,
        participants: [currentUserId, peerId],
        lastMessage: body,
        lastMessageAt: new Date().toISOString(),
        unreadCount: { [peerId]: 1, [currentUserId]: 0 },
      })
    }

    return { data: newMessage, message: 'Message sent' }
  },
}
