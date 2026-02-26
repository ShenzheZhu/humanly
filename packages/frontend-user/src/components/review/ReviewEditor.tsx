'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LexicalEditor, TrackedEvent } from '@humory/editor'
import type { Review, InsertReviewEvent } from '@humory/shared'
import { reviewApi } from '@/lib/api/review-api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Save, Send, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReviewEditorProps {
  reviewId: string
  paperId: string
  userId: string
  initialReview?: Review
  onReviewUpdate?: (review: Review) => void
  onSubmit?: () => void
}

export default function ReviewEditor({
  reviewId,
  paperId,
  userId,
  initialReview,
  onReviewUpdate,
  onSubmit,
}: ReviewEditorProps) {
  const [review, setReview] = useState<Review | null>(initialReview || null)
  const [loading, setLoading] = useState(!initialReview)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)

  const eventBuffer = useRef<InsertReviewEvent[]>([])
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<Date>(new Date())

  const { toast } = useToast()

  // Load or create review
  useEffect(() => {
    if (!initialReview) {
      loadReview()
    }
  }, [reviewId])

  const loadReview = async () => {
    try {
      setLoading(true)
      const data = await reviewApi.getOrCreate(paperId)
      setReview(data)
      setWordCount(data.wordCount || 0)
      setCharacterCount(data.characterCount || 0)
    } catch (error) {
      console.error('Failed to load review:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load review. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle content changes
  const handleContentChange = useCallback((content: Record<string, any>, plainText: string) => {
    setHasUnsavedChanges(true)

    // Update word and character counts
    const words = plainText.split(/\s+/).filter(word => word.length > 0).length
    const characters = plainText.length
    setWordCount(words)
    setCharacterCount(characters)

    // Auto-save every 30 seconds if there are changes
    const timeSinceLastSave = Date.now() - lastSaveRef.current.getTime()
    if (timeSinceLastSave > 30000) {
      handleSave(content, plainText)
    }
  }, [])

  // Handle individual tracking events
  const handleEventTracked = useCallback((event: TrackedEvent) => {
    // Convert TrackedEvent to InsertReviewEvent
    const reviewEvent: InsertReviewEvent = {
      eventType: event.eventType,
      eventData: {
        keyCode: event.keyCode,
        keyChar: event.keyChar,
        textBefore: event.textBefore,
        textAfter: event.textAfter,
        editorStateBefore: event.editorStateBefore,
        editorStateAfter: event.editorStateAfter,
        metadata: event.metadata,
      },
      selectionText: event.textAfter,
      cursorPosition: event.cursorPosition,
      timestamp: event.timestamp,
    }

    // Add to buffer
    eventBuffer.current.push(reviewEvent)

    // Flush if buffer is large enough (100 events)
    if (eventBuffer.current.length >= 100) {
      flushEvents()
    } else {
      // Schedule flush in 5 seconds if not already scheduled
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushEvents()
        }, 5000)
      }
    }
  }, [reviewId])

  // Flush event buffer to server
  const flushEvents = async () => {
    if (eventBuffer.current.length === 0) return

    const eventsToSend = [...eventBuffer.current]
    eventBuffer.current = []

    // Clear flush timer
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    try {
      await reviewApi.trackEvents(reviewId, eventsToSend)
    } catch (error) {
      console.error('Failed to track events:', error)
      // Re-add events to buffer if failed
      eventBuffer.current = [...eventsToSend, ...eventBuffer.current]
    }
  }

  // Flush events on unmount
  useEffect(() => {
    return () => {
      if (eventBuffer.current.length > 0) {
        // Send synchronously on unmount
        navigator.sendBeacon(
          `/api/v1/reviews/${reviewId}/events`,
          JSON.stringify(eventBuffer.current)
        )
      }
    }
  }, [reviewId])

  // Manual save
  const handleSave = async (content?: Record<string, any>, plainText?: string) => {
    if (!review) return

    try {
      setSaving(true)

      // Get current editor content if not provided
      const updateData = content
        ? {
            content,
            plainText,
            wordCount,
            characterCount,
          }
        : {}

      const updated = await reviewApi.update(reviewId, updateData)
      setReview(updated)
      setHasUnsavedChanges(false)
      lastSaveRef.current = new Date()

      if (onReviewUpdate) {
        onReviewUpdate(updated)
      }

      toast({
        title: 'Saved',
        description: 'Your review has been saved.',
      })
    } catch (error) {
      console.error('Failed to save review:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save review. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Submit review
  const handleSubmit = async () => {
    if (!review) return

    // Validate minimum word count
    if (wordCount < 50) {
      toast({
        variant: 'destructive',
        title: 'Review too short',
        description: 'Your review must have at least 50 words before submission.',
      })
      return
    }

    try {
      setSubmitting(true)

      // Flush any pending events before submission
      await flushEvents()

      // Save current content first
      await handleSave()

      // Submit review
      await reviewApi.submit(reviewId, {
        // Can add scores and recommendation here in future
      })

      toast({
        title: 'Review submitted',
        description: 'Your review has been successfully submitted.',
      })

      if (onSubmit) {
        onSubmit()
      }
    } catch (error: any) {
      console.error('Failed to submit review:', error)
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error.message || 'Failed to submit review. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Loading review...</p>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-600">Failed to load review</p>
      </div>
    )
  }

  const isSubmitted = review.status === 'submitted'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Write Your Review</h2>
            <p className="text-sm text-gray-600">
              {wordCount} words • {characterCount} characters
              {wordCount < 50 && (
                <span className="text-orange-600 ml-2">
                  (Minimum 50 words required)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-gray-500">Unsaved changes</span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving || isSubmitted}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || isSubmitted || wordCount < 50}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>

        {isSubmitted && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
            <AlertCircle className="h-4 w-4" />
            This review has been submitted and can no longer be edited.
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <LexicalEditor
          documentId={reviewId}
          userId={userId}
          initialContent={review.content}
          placeholder="Write your peer review here. Provide detailed feedback on the paper's contributions, methodology, results, and presentation..."
          editable={!isSubmitted}
          trackingEnabled={!isSubmitted}
          onContentChange={handleContentChange}
          onEventTracked={handleEventTracked}
          className="h-full"
        />
      </div>

      {/* Footer stats */}
      <div className="border-t bg-gray-50 p-3">
        <div className="text-xs text-gray-600 flex items-center gap-4">
          <span>Status: {review.status === 'draft' ? 'Draft' : 'Submitted'}</span>
          <span>Started: {new Date(review.createdAt).toLocaleDateString()}</span>
          {review.submittedAt && (
            <span>Submitted: {new Date(review.submittedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
