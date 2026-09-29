import { Router } from 'express'
import * as controller from '../controllers/authController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter, registerLimiter } from '../middleware/rateLimiter.js'
import {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  verifyEmailSchema, changePasswordSchema,
} from '../validators/authValidators.js'

const router = Router()

router.post('/register', registerLimiter, validate({ body: registerSchema }), controller.register)
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login)
router.post('/refresh', controller.refresh)
router.post('/logout', controller.logout)
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword)
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword)
router.post('/verify-email', validate({ body: verifyEmailSchema }), controller.verifyEmail)
router.get('/verify-email', validate({ query: verifyEmailSchema }), controller.verifyEmail)
router.get('/me', authenticate, controller.me)
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword)

export default router
