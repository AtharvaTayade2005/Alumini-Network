import { Server } from 'socket.io'
import config from '../config/env.js'
import logger from '../utils/logger.js'
import { authenticateSocket } from '../middleware/auth.js'
import { registerMessageHandlers, registerPresenceHandlers } from './messageHandlers.js'
import { assertConversationMember } from '../services/messageService.js'

let io = null

export function initialiseRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
    path: '/socket.io',
    maxHttpBufferSize: 1e6,
  })

  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`)

    logger.debug('socket connected', { userId: socket.user.id })

    registerPresenceHandlers(socket)
    registerMessageHandlers(socket, io)

    socket.on('conversation:join', async (payload, ack) => {
      const peerId = payload?.peerId
      if (!peerId) {
        return ack?.({ ok: false, error: 'peerId is required' })
      }
      const allowed = await assertConversationMember(socket.user.id, peerId)
      if (!allowed) return ack?.({ ok: false, error: 'not authorised' })

      const room = roomName(socket.user.id, peerId)
      socket.join(room)
      return ack?.({ ok: true })
    })

    socket.on('conversation:leave', (payload) => {
      socket.leave(roomName(socket.user.id, payload?.peerId))
    })

    socket.on('disconnect', (reason) => {
      logger.debug('socket disconnected', { userId: socket.user.id, reason })
    })
  })

  return io
}

export function getRealtime() {
  return io
}

export function roomName(userA, userB) {
  return `dm:${[userA, userB].sort().join(':')}`
}

export async function emitToUsers(userIds, event, payload) {
  if (!io) return
  for (const id of new Set(userIds)) {
    io.to(`user:${id}`).emit(event, payload)
  }
}
