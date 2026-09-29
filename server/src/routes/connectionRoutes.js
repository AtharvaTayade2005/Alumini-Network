import { Router } from 'express'
import * as controller from '../controllers/connectionController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  listConnectionsSchema, pendingSchema, connectSchema, respondSchema,
  userParamSchema, connectionParamSchema,
} from '../validators/connectionValidators.js'

const router = Router()

router.use(authenticate)

router.get('/', validate({ query: listConnectionsSchema }), controller.list)
router.get('/pending', validate({ query: pendingSchema }), controller.pending)
router.get('/stats', controller.stats)
router.get('/status/:userId', validate({ params: userParamSchema }), controller.status)
router.get('/mutuals/:userId', validate({ params: userParamSchema }), controller.mutuals)
router.post('/', validate({ body: connectSchema }), controller.request)
router.patch(
  '/:connectionId',
  validate({ params: connectionParamSchema, body: respondSchema }),
  controller.respond,
)
router.delete('/:userId', validate({ params: userParamSchema }), controller.remove)
router.post('/block/:userId', validate({ params: userParamSchema }), controller.block)

export default router
