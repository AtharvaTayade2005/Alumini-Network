import * as authService from '../services/authService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { sendCreated, sendSuccess } from '../utils/response.js'

function contextOf(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') }
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, contextOf(req))
  sendCreated(res, { user: result.user }, result.message)
})

export const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body, contextOf(req))
  authService.setSessionCookies(res, session)
  sendSuccess(res, {
    user: session.user,
    accessToken: session.accessToken,
    expiresAt: session.refreshExpiresAt,
  }, { message: 'Signed in successfully' })
})

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refresh_token ?? req.body?.refreshToken
  const session = await authService.refresh(raw)
  authService.setSessionCookies(res, session)
  sendSuccess(res, {
    user: session.user,
    accessToken: session.accessToken,
  }, { message: 'Session refreshed' })
})

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.refresh_token ?? req.body?.refreshToken
  const result = await authService.logout(raw, contextOf(req))
  authService.clearSessionCookies(res)
  sendSuccess(res, null, { message: result.message })
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email, contextOf(req))
  sendSuccess(res, null, { message: result.message })
})

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body, contextOf(req))
  sendSuccess(res, null, { message: result.message })
})

export const verifyEmail = asyncHandler(async (req, res) => {
  // The verification link is a GET, so the token arrives in the query string.
  const result = await authService.verifyEmail(
    req.query.token ?? req.body?.token, contextOf(req),
  )
  sendSuccess(res, null, { message: result.message })
})

export const me = asyncHandler(async (req, res) => {
  const result = await authService.getMe(req.user.id)
  sendSuccess(res, result)
})

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body, contextOf(req))
  authService.clearSessionCookies(res)
  sendSuccess(res, null, { message: result.message })
})
