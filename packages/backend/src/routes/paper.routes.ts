import { Router } from 'express'
import multer from 'multer'
import {
  uploadPaper,
  getPaper,
  listPapers,
  getMyPapers,
  streamPDF,
  updatePaper,
  deletePaper,
  logAccess,
  addReadingTime,
  assignReviewer,
  listReviewers,
  updateReviewerPermissions,
  removeReviewer
} from '../controllers/paper.controller'
import { authenticate } from '../middleware/auth.middleware'
import {
  requireProjectAdmin,
  requirePaperViewAccess
} from '../middleware/review-auth.middleware'

const router = Router()

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  }
})

// Paper management routes
router.post(
  '/projects/:projectId/papers',
  authenticate,
  requireProjectAdmin,
  upload.single('pdf'),
  uploadPaper
)

router.get(
  '/projects/:projectId/papers',
  authenticate,
  requireProjectAdmin,
  listPapers
)

router.get(
  '/papers/:paperId',
  authenticate,
  requirePaperViewAccess,
  getPaper
)

router.patch(
  '/papers/:paperId',
  authenticate,
  requireProjectAdmin,
  updatePaper
)

router.delete(
  '/papers/:paperId',
  authenticate,
  requireProjectAdmin,
  deletePaper
)

// PDF streaming
router.get(
  '/papers/:paperId/content',
  authenticate,
  requirePaperViewAccess,
  streamPDF
)

// Paper access logging
router.post(
  '/papers/:paperId/access-logs',
  authenticate,
  requirePaperViewAccess,
  logAccess
)

router.post(
  '/papers/:paperId/reading-time',
  authenticate,
  requirePaperViewAccess,
  addReadingTime
)

// Reviewer management
router.post(
  '/papers/:paperId/reviewers',
  authenticate,
  requireProjectAdmin,
  assignReviewer
)

router.get(
  '/papers/:paperId/reviewers',
  authenticate,
  requirePaperViewAccess,
  listReviewers
)

router.patch(
  '/papers/:paperId/reviewers/:reviewerId',
  authenticate,
  requireProjectAdmin,
  updateReviewerPermissions
)

router.delete(
  '/papers/:paperId/reviewers/:reviewerId',
  authenticate,
  requireProjectAdmin,
  removeReviewer
)

// Get my assigned papers (as reviewer)
router.get(
  '/reviewers/me/papers',
  authenticate,
  getMyPapers
)

export default router
