import { Request, Response } from 'express'
import { ReviewService } from '../services/review.service'
import { ReviewCommentModel } from '../models/review-comment.model'
import { asyncHandler } from '../middleware/error-handler'

// Get or create review for a paper (auto-create on first access)
export const getOrCreateReview = asyncHandler(async (req: Request, res: Response) => {
  const { paperId } = req.params

  const review = await ReviewService.getOrCreate(paperId, req.user!.userId)

  res.json({
    success: true,
    data: review
  })
})

// Get review by ID
export const getReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params

  const review = await ReviewService.get(reviewId, req.user!.userId)

  res.json({
    success: true,
    data: review
  })
})

// Update review content
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { content, scores, recommendation, confidenceLevel } = req.body

  const review = await ReviewService.update(
    reviewId,
    {
      content,
      scores,
      recommendation,
      confidenceLevel
    },
    req.user!.userId
  )

  res.json({
    success: true,
    data: review
  })
})

// Submit review
export const submitReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { scores, recommendation, confidenceLevel } = req.body

  const review = await ReviewService.submit(
    reviewId,
    {
      scores,
      recommendation,
      confidenceLevel
    },
    req.user!.userId
  )

  res.json({
    success: true,
    data: review,
    message: 'Review submitted successfully'
  })
})

// Track review events (keystroke tracking)
export const trackEvents = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { events } = req.body

  const count = await ReviewService.trackEvents(reviewId, events, req.user!.userId)

  res.json({
    success: true,
    data: { eventsTracked: count }
  })
})

// Get review statistics
export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params

  const stats = await ReviewService.getStatistics(reviewId, req.user!.userId)

  res.json({
    success: true,
    data: stats
  })
})

// Get anonymous reviews for a paper (admin only)
export const getAnonymousReviews = asyncHandler(async (req: Request, res: Response) => {
  const { paperId } = req.params

  const reviews = await ReviewService.getAnonymousReviews(paperId, req.user!.userId)

  res.json({
    success: true,
    data: reviews
  })
})

// Add a comment to the paper
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const {
    paperId,
    pageNumber,
    positionX,
    positionY,
    selectedText,
    commentText,
    commentType
  } = req.body

  const comment = await ReviewCommentModel.create({
    reviewId,
    reviewerId: req.user!.userId,
    paperId,
    pageNumber,
    positionX,
    positionY,
    selectedText,
    commentText,
    commentType
  })

  res.status(201).json({
    success: true,
    data: comment
  })
})

// Get comments for a review
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { pageNumber } = req.query

  const filter: any = { reviewId }
  if (pageNumber) {
    filter.pageNumber = Number(pageNumber)
  }

  const { comments } = await ReviewCommentModel.find(filter)

  res.json({
    success: true,
    data: comments
  })
})

// Update a comment
export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const { commentId } = req.params
  const { commentText, commentType, isResolved } = req.body

  const comment = await ReviewCommentModel.update(commentId, {
    commentText,
    commentType,
    isResolved
  })

  res.json({
    success: true,
    data: comment
  })
})

// Delete a comment
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const { commentId } = req.params

  // Verify ownership
  const isOwner = await ReviewCommentModel.isOwner(commentId, req.user!.userId)
  if (!isOwner) {
    res.status(403).json({
      success: false,
      message: 'Only the comment owner can delete this comment'
    })
    return
  }

  await ReviewCommentModel.delete(commentId)

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  })
})
