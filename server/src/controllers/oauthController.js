import * as oauthService from '../services/oauthService.js'
import * as authService from '../services/authService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getQuery } from '../middleware/validate.js'
import { sendSuccess } from '../utils/response.js'
import { contextOf } from '../utils/requestContext.js'
import { badRequest } from '../utils/errors.js'

/** Providers that have credentials configured right now. */
export const providers = asyncHandler(async (_req, res) => {
  sendSuccess(res, { providers: oauthService.listProviders() })
})

/**
 * Starts the flow. The browser is redirected to the provider; the signed state
 * carries the PKCE verifier and the post-login destination.
 */
export const start = asyncHandler(async (req, res) => {
  const { provider } = req.params
  const { redirectTo, link } = getQuery(req)

  // Linking is only meaningful for a signed-in user, and the target account is
  // taken from the session rather than the query string.
  const linkToUserId = link === 'true' ? req.user?.id ?? null : null
  if (link === 'true' && !linkToUserId) {
    throw badRequest('Sign in before linking a provider account')
  }

  const { url } = await oauthService.buildAuthorizationUrl(provider, {
    redirectTo: oauthService.safeRedirect(redirectTo),
    linkToUserId,
  })
  res.redirect(302, url)
})

/**
 * Provider callback. Issues the same session the password flow would, sets the
 * usual cookies, then sends the browser into the app.
 */
export const callback = asyncHandler(async (req, res) => {
  const { provider } = req.params
  const { code, state, error: providerError } = getQuery(req)

  if (providerError) {
    return res.redirect(302, `/login?oauth_error=${encodeURIComponent(providerError)}`)
  }

  const { user, linked, redirectTo } = await oauthService.resolveCallback(
    provider, { code, state }, contextOf(req),
  )

  const session = await authService.issueSession(user, contextOf(req))
  authService.setSessionCookies(res, session)

  if (linked) {
    return res.redirect(302, '/profile?linked=' + encodeURIComponent(provider))
  }
  return res.redirect(302, redirectTo)
})

/** Linked providers for the signed-in user. */
export const linkedAccounts = asyncHandler(async (req, res) => {
  const accounts = await oauthService.listLinkedAccounts(req.user.id)
  sendSuccess(res, {
    accounts,
    providers: oauthService.listProviders(),
    linked: accounts.map((a) => a.provider),
  })
})

/** Begins linking a provider to the current account. */
export const link = asyncHandler(async (req, res) => {
  const { provider } = req.params
  const { url } = await oauthService.buildAuthorizationUrl(provider, {
    linkToUserId: req.user.id,
    redirectTo: '/profile',
  })
  res.redirect(302, url)
})

export const unlink = asyncHandler(async (req, res) => {
  const { provider } = req.params
  const result = await oauthService.unlinkAccount(req.user.id, provider)
  sendSuccess(res, result, { message: 'Sign-in method removed' })
})
