import { Router } from 'express'
import healthController from '../controllers/healthController.js'

const router = Router()

// Mounted at /api/health by routes/index.js.
router.get('/', healthController.health)

export default router
