import * as connectionService from '../services/connectionService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getQuery } from '../middleware/validate.js'
import { sendCreated, sendSuccess } from '../utils/response.js'

export const list = asyncHandler(async (req, res) => {
  const result = await connectionService.listConnections(req.user.id, getQuery(req))
  sendSuccess(res, result.rows, { meta: { counts: result.counts } })
})

export const pending = asyncHandler(async (req, res) => {
  const requests = await connectionService.listPending(req.user.id, getQuery(req))
  sendSuccess(res, requests)
})

export const request = asyncHandler(async (req, res) => {
  const connection = await connectionService.sendRequest({
    requesterId: req.user.id,
    addresseeId: req.body.userId,
    message: req.body.message,
  })
  sendCreated(res, connection, 'Connection request sent')
})

export const respond = asyncHandler(async (req, res) => {
  const { connectionId } = req.params
  const { action } = req.body
  const connection = await connectionService.respond({
    connectionId,
    userId: req.user.id,
    accept: action === 'accept',
  })
  sendSuccess(
    res, connection,
    { message: action === 'accept' ? 'Connection accepted' : 'Connection declined' },
  )
})

export const remove = asyncHandler(async (req, res) => {
  await connectionService.remove(req.user.id, req.params.userId)
  sendSuccess(res, null, { message: 'Connection removed' })
})

export const block = asyncHandler(async (req, res) => {
  await connectionService.block(req.user.id, req.params.userId)
  sendSuccess(res, null, { message: 'User blocked' })
})

export const status = asyncHandler(async (req, res) => {
  const state = await connectionService.getRequestState(req.user.id, req.params.userId)
  sendSuccess(res, { state })
})

export const mutuals = asyncHandler(async (req, res) => {
  const mutuals = await connectionService.getMutuals(req.user.id, req.params.userId)
  sendSuccess(res, mutuals)
})

export const stats = asyncHandler(async (req, res) => {
  const result = await connectionService.getStats(req.user.id)
  sendSuccess(res, result)
})
