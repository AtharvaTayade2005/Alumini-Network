import * as messageService from '../services/messageService.js'
import { roomName } from './index.js'

export function registerMessageHandlers(socket, io) {
  socket.on('message:send', async (payload, ack) => {
    try {
      const recipientId = payload?.recipientId
      const body = String(payload?.body ?? '').trim()

      if (!recipientId || recipientId === socket.user.id) {
        return ack?.({ ok: false, error: 'Invalid recipient' })
      }
      if (!body || body.length > 5000) {
        return ack?.({ ok: false, error: 'Message must be 1-5000 characters' })
      }

      const allowed = await messageService.assertConversationMember(
        socket.user.id, recipientId,
      )
      if (!allowed) {
        return ack?.({ ok: false, error: 'You cannot message this person' })
      }

      const message = await messageService.sendMessage({
        senderId: socket.user.id,
        recipientId,
        body,
      })

      const room = roomName(socket.user.id, recipientId)
      io.to(room).emit('message:new', { ...message, conversationId: room })
      io.to(`user:${socket.user.id}`).emit('message:new', { ...message, conversationId: room })
      io.to(`user:${recipientId}`).emit('message:new', {
        ...message, conversationId: room,
      })

      return ack?.({ ok: true, message })
    } catch {
      socket.emit('message:error', { error: 'Failed to send message' })
      return ack?.({ ok: false, error: 'Failed to send message' })
    }  })

  socket.on('message:read', async (payload) => {
    const peerId = payload?.peerId
    if (!peerId) return

    const count = await messageService.markRead(socket.user.id, peerId)
    if (count > 0) {
      socket.to(roomName(socket.user.id, peerId)).emit('message:read', {
        by: socket.user.id,
        at: new Date().toISOString(),
      })
    }
  })

  socket.on('typing', (payload) => {
    const peerId = payload?.recipientId
    if (!peerId) return
    socket.to(roomName(socket.user.id, peerId)).emit('typing', {
      userId: socket.user.id,
      isTyping: Boolean(payload.isTyping),
    })
  })
}

export function registerPresenceHandlers(socket) {
  const userId = socket.user.id

  socket.on('presence:online', () => {
    socket.broadcast.emit('user:online', { userId })
  })

  socket.on('presence:offline', () => {
    socket.broadcast.emit('user:offline', { userId })
  })
}
