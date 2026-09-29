import { z } from 'zod'

export const listConnectionsSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'blocked']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const pendingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const connectSchema = z.object({
  userId: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
})

export const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

export const userParamSchema = z.object({
  userId: z.string().uuid(),
})

export const connectionParamSchema = z.object({
  connectionId: z.string().uuid(),
})
