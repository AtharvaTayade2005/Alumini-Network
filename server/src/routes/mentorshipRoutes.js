import { Router } from 'express'
import * as controller from '../controllers/mentorshipController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { z } from 'zod'
import { optionalText } from '../validators/authValidators.js'
import {
  mentorshipRequestSchema, mentorshipRespondSchema, mentorshipQuerySchema,
} from '../validators/communityValidators.js'

const requestParamSchema = z.object({ requestId: z.string().uuid() })
const relationshipParamSchema = z.object({ relationshipId: z.string().uuid() })

const mentorshipsQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'ended']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const mentorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
})

const endMentorshipSchema = z.object({
  endReason: optionalText(1000),
})

const router = Router()

router.use(authenticate)

router.get('/mentors', validate({ query: mentorsQuerySchema }), controller.findMentors)
router.get('/requests', validate({ query: mentorshipQuerySchema }), controller.listRequests)
router.get('/mentorships', validate({ query: mentorshipsQuerySchema }), controller.listMentorships)

router.post('/requests', validate({ body: mentorshipRequestSchema }), controller.request)
router.patch(
  '/requests/:requestId',
  validate({ params: requestParamSchema, body: mentorshipRespondSchema }),
  controller.respond,
)
router.delete(
  '/requests/:requestId',
  validate({ params: requestParamSchema }),
  controller.cancel,
)
router.patch(
  '/mentorships/:relationshipId/end',
  validate({ params: relationshipParamSchema, body: endMentorshipSchema }),
  controller.end,
)
router.patch(
  '/mentorships/:relationshipId/complete',
  validate({ params: relationshipParamSchema }),
  controller.complete,
)

export default router
