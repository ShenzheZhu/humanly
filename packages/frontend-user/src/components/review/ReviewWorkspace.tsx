'use client'

import { useState, useEffect } from 'react'
import PDFViewer from './PDFViewer'
import ReviewEditor from './ReviewEditor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, ChevronRight, Bot, FileText, PanelLeftClose, PanelRightClose } from 'lucide-react'
import type { Review, ReviewComment } from '@humory/shared'
import { reviewApi, commentApi } from '@/lib/api/review-api'
import { useToast } from '@/hooks/use-toast'

interface ReviewWorkspaceProps {
  paperId: string
  userId: string
}

export default function ReviewWorkspace({ paperId, userId }: ReviewWorkspaceProps) {
  const [review, setReview] = useState<Review | null>(null)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [loading, setLoading] = useState(true)
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [activeTab, setActiveTab] = useState<'review' | 'ai'>('review')

  const { toast } = useToast()

  // Load review and comments
  useEffect(() => {
    loadData()
  }, [paperId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reviewData, commentsData] = await Promise.all([
        reviewApi.getOrCreate(paperId),
        commentApi.list(paperId),
      ])
      setReview(reviewData)
      setComments(commentsData)
    } catch (error) {
      console.error('Failed to load review workspace:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load review workspace. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle adding a comment from PDF selection
  const handleCommentAdd = async (commentData: {
    pageNumber: number
    positionX: number
    positionY: number
    selectedText?: string
  }) => {
    if (!review) return

    try {
      const newComment = await commentApi.create(review.id, {
        ...commentData,
        commentText: '', // Will be filled in later
      })
      setComments((prev) => [...prev, newComment])

      toast({
        title: 'Comment added',
        description: 'Click the marker on the PDF to edit your comment.',
      })
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
      })
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading review workspace...</p>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load review</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Peer Review Workspace</h1>
          <p className="text-sm text-gray-600">Paper ID: {paperId.substring(0, 8)}...</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            title={showLeftPanel ? 'Hide PDF' : 'Show PDF'}
          >
            {showLeftPanel ? <PanelLeftClose className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRightPanel(!showRightPanel)}
            title={showRightPanel ? 'Hide Assistant' : 'Show Assistant'}
          >
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        {showLeftPanel && (
          <div className="w-1/3 border-r bg-white">
            <PDFViewer
              paperId={paperId}
              onCommentAdd={handleCommentAdd}
              comments={comments}
            />
          </div>
        )}

        {/* Center Panel - Review Editor */}
        <div className={`${showLeftPanel && showRightPanel ? 'w-1/3' : showLeftPanel || showRightPanel ? 'w-2/3' : 'w-full'} bg-white`}>
          <ReviewEditor
            reviewId={review.id}
            paperId={paperId}
            userId={userId}
            initialReview={review}
            onReviewUpdate={setReview}
          />
        </div>

        {/* Right Panel - AI Assistant / Comments */}
        {showRightPanel && (
          <div className="w-1/3 border-l bg-white">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'review' | 'ai')} className="h-full flex flex-col">
              <div className="border-b p-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="review">
                    <FileText className="h-4 w-4 mr-2" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="ai">
                    <Bot className="h-4 w-4 mr-2" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="review" className="flex-1 overflow-auto p-4 mt-0">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Your Comments ({comments.length})</h3>

                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No comments yet. Select text in the PDF to add comments.
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id} className="p-3">
                        <div className="text-xs text-gray-500 mb-1">
                          Page {comment.pageNumber}
                        </div>
                        {comment.selectedText && (
                          <div className="text-xs bg-yellow-50 p-2 rounded mb-2 border border-yellow-200">
                            "{comment.selectedText}"
                          </div>
                        )}
                        <div className="text-sm">
                          {comment.commentText || (
                            <span className="text-gray-400 italic">
                              Click to add comment text...
                            </span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 overflow-auto p-4 mt-0">
                <AIAssistantPanel paperId={paperId} reviewId={review.id} userId={userId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

// AI Assistant Panel Component (Placeholder for now)
function AIAssistantPanel({
  paperId,
  reviewId,
  userId,
}: {
  paperId: string
  reviewId: string
  userId: string
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <Bot className="h-12 w-12 text-gray-400 mb-3" />
        <h3 className="font-semibold mb-2">AI Review Assistant</h3>
        <p className="text-sm text-gray-600 mb-4">
          The AI assistant can help you with fact-checking, suggesting improvements,
          and answering questions about the paper.
        </p>
        <p className="text-xs text-gray-500">
          This feature will be implemented in a future phase.
        </p>
      </div>
    </div>
  )
}
