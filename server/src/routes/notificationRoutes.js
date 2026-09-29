import { Router } from 'express'
import * as controller from '../controllers/notificationController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { idParamSchema } from '../validators/profileValidators.js'
import { z } from 'zod'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
  type: z.string().trim().max(40).optional(),
})

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  mutedTypes: z.array(z.string().trim().max(40)).max(20).optional(),
})

const router = Router()

router.use(authenticate)

router.get('/', validate({ query: listSchema }), controller.list)
router.get('/unread-count', controller.unreadCount)
router.post('/read-all', controller.markAllRead)
router.get('/preferences', controller.getPreferences)
router.patch('/preferences', validate({ body: preferencesSchema }), controller.updatePreferences)
router.patch('/:id/read', validate({ params: idParamSchema }), controller.markRead)
router.delete('/:id', validate({ params: idParamSchema }), controller.remove)

export default router
