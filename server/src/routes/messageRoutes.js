import { Router } from 'express'
import * as controller from '../controllers/messageController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  sendMessageSchema, peerParamSchema, searchMessagesSchema,
} from '../validators/messageValidators.js'

const router = Router()

router.use(authenticate)

router.get('/conversations', controller.listConversations)
router.get('/search', validate({ query: searchMessagesSchema }), controller.searchMessages)
router.get('/with/:peerId', validate({ params: peerParamSchema }), controller.listMessages)
router.post('/', validate({ body: sendMessageSchema }), controller.sendMessage)
router.post('/read/:peerId', validate({ params: peerParamSchema }), controller.markRead)

export default router
