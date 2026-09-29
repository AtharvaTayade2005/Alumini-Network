import { Router } from 'express'
import { z } from 'zod'
import * as oauthController from '../controllers/oauthController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

/**
 * OAuth sign-in.
 *
 * `authenticate` is applied per route rather than router-wide because the
 * callback has to work for a browser that is not yet signed in.
 */
const router = Router()

const providerParamSchema = z.object({
  provider: z.enum(['google', 'linkedin', 'sso']),
})

const startQuerySchema = z.object({
  redirectTo: z.string().max(300).optional(),
  link: z.enum(['true', 'false']).optional(),
})

const callbackQuerySchema = z.object({
  code: z.string().max(500).optional(),
  state: z.string().max(4000).optional(),
  error: z.string().max(200).optional(),
})

/** Which providers are available, so the client only renders working buttons. */
router.get('/oauth/providers', oauthController.providers)

/**
 * Declared before '/oauth/:provider' so the literal path wins: Express matches
 * in registration order and 'accounts' would otherwise be read as a provider.
 */
router.get('/oauth/accounts', authenticate, oauthController.linkedAccounts)

router.get('/oauth/:provider', validate({
  params: providerParamSchema, query: startQuerySchema,
}), oauthController.start)

router.get('/oauth/:provider/callback', authLimiter, validate({
  params: providerParamSchema, query: callbackQuerySchema,
}), oauthController.callback)

// Everything below acts on the signed-in user's own account.
router.get('/oauth/:provider/link', authenticate, validate({
  params: providerParamSchema,
}), oauthController.link)
router.delete('/oauth/:provider/link', authenticate, validate({
  params: providerParamSchema,
}), oauthController.unlink)

export default router
