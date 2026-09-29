import { z } from 'zod'

export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
})

export const markReadSchema = z.object({
  peerId: z.string().uuid(),
})

export const searchMessagesSchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const peerParamSchema = z.object({
  peerId: z.string().uuid(),
})
