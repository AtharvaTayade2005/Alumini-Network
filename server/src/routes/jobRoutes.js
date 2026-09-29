import { Router } from 'express'
import { z } from 'zod'
import * as controller from '../controllers/jobController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import {
  jobSchema, jobUpdateSchema, jobQuerySchema, applicationSchema,
  applicationStatusSchema, applicationQuerySchema, companyQuerySchema,
  jobModerationSchema,
} from '../validators/communityValidators.js'

const jobParamSchema = z.object({ jobId: z.string().uuid() })
const applicationParamSchema = z.object({ applicationId: z.string().uuid() })
const companyParamSchema = z.object({ companyId: z.string().uuid() })

const router = Router()

router.use(authenticate)

router.get('/companies', validate({ query: companyQuerySchema }), controller.listCompanies)
router.get('/companies/:companyId', validate({
  params: companyParamSchema, query: companyQuerySchema,
}), controller.getCompany)

// Saved jobs and applications are personal to the caller, so they are declared
// before the '/:jobId' routes to keep the paths unambiguous.
router.get('/saved', validate({ query: jobQuerySchema }), controller.listSaved)
router.delete('/saved/:jobId', validate({ params: jobParamSchema }), controller.unsave)
router.get('/applications', validate({ query: applicationQuerySchema }), controller.myApplications)
router.patch(
  '/applications/:applicationId/withdraw',
  validate({ params: applicationParamSchema }),
  controller.withdraw,
)

router.get('/', validate({ query: jobQuerySchema }), controller.list)
router.post('/', validate({ body: jobSchema }), controller.create)
router.get('/:jobId', validate({ params: jobParamSchema }), controller.getById)
router.put(
  '/:jobId',
  validate({ params: jobParamSchema, body: jobUpdateSchema }),
  controller.update,
)
router.delete('/:jobId', validate({ params: jobParamSchema }), controller.remove)

router.get(
  '/:jobId/applications',
  validate({ params: jobParamSchema, query: applicationQuerySchema }),
  controller.listApplications,
)
router.post(
  '/:jobId/applications',
  validate({ params: jobParamSchema, body: applicationSchema }),
  controller.apply,
)
router.patch(
  '/:jobId/applications/:applicationId',
  validate({ params: jobParamSchema.merge(applicationParamSchema), body: applicationStatusSchema }),
  controller.review,
)
// Role checks live in the service (jobService.assertCanPostOrModerate) so they
// are enforced for every caller, not just this path.
router.patch(
  '/:jobId/moderate',
  validate({ params: jobParamSchema, body: jobModerationSchema }),
  controller.moderate,
)
router.post('/:jobId/save', validate({ params: jobParamSchema }), controller.save)

export default router
